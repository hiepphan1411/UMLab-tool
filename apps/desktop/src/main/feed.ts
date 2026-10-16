import type { ChangeStream, ChangeStreamDocument, Collection, Document, Timestamp } from 'mongodb';
import { database } from './db';

export interface FeedOptions<T extends Document> {
  name: string;
  collection: () => Collection<T>;
  pipeline: Document[];
  fullDocument?: boolean;
  onChange: (ev: ChangeStreamDocument<T>) => void;
  /** Chế độ hỏi vòng khi không có change stream (Mongo đơn lẻ). */
  poll: () => Promise<void>;
  pollMs: number;
  /** Gọi khi vừa (re)kết nối — nơi nạp lại toàn bộ để không lỡ thay đổi trong lúc mất kết nối. */
  onReconnect?: () => Promise<void> | void;
}

/**
 * Theo dõi thay đổi của một collection: ưu tiên change stream (realtime), tự chuyển sang hỏi vòng
 * khi DB không hỗ trợ; tự dựng lại khi mất kết nối rồi có lại.
 */
export class ChangeFeed<T extends Document> {
  private stream: ChangeStream<T> | null = null;
  private timer: NodeJS.Timeout | null = null;
  private retry: NodeJS.Timeout | null = null;
  private unsub: (() => void) | null = null;
  private gen = -1;
  private stopped = false;
  private polling = false;
  /** Xong khi stream đã có mốc thời gian bắt đầu — đọc dữ liệu sau mốc này sẽ không lỡ thay đổi nào. */
  ready: Promise<void> = Promise.resolve();

  constructor(private readonly opts: FeedOptions<T>) {}

  start(): Promise<void> {
    this.stopped = false;
    this.unsub = database.onStatus((s) => {
      if (s.state === 'online' && database.gen !== this.gen) void this.attach(true);
      if (s.state !== 'online') this.detach();
    });
    if (database.ready) this.ready = this.attach(false);
    return this.ready;
  }

  stop(): void {
    this.stopped = true;
    this.unsub?.();
    this.unsub = null;
    this.detach();
  }

  private detach(): void {
    if (this.timer) clearInterval(this.timer);
    if (this.retry) clearTimeout(this.retry);
    this.timer = null;
    this.retry = null;
    const s = this.stream;
    this.stream = null;
    if (s) void s.close().catch(() => {});
  }

  private async attach(reconnected: boolean): Promise<void> {
    if (this.stopped || !database.ready) return;
    this.detach();
    this.gen = database.gen;
    const realtime = database.current.realtime;
    // Lấy mốc thời gian cụm TRƯỚC khi nạp lại/mở stream: stream phát lại mọi thay đổi từ mốc này,
    // nên dữ liệu đọc sau mốc (lần nạp đầu, nạp lại khi kết nối lại) không bị hở khoảng nào.
    const startAt: Timestamp | undefined = realtime ? await database.clusterTime() : undefined;
    if (reconnected && this.opts.onReconnect) {
      try {
        await this.opts.onReconnect();
      } catch (e) {
        console.warn(`[feed:${this.opts.name}] reload`, e);
      }
    }
    if (realtime) {
      try {
        if (this.stopped) return;
        const cs = this.opts.collection().watch<T>(this.opts.pipeline, {
          fullDocument: this.opts.fullDocument ? 'updateLookup' : undefined,
          startAtOperationTime: startAt,
        });
        cs.on('change', (ev) => {
          try {
            this.opts.onChange(ev);
          } catch (e) {
            console.warn(`[feed:${this.opts.name}]`, e);
          }
        });
        cs.on('error', (e) => {
          console.warn(`[feed:${this.opts.name}] stream error`, e.message);
          if (this.stream === cs) {
            this.detach();
            this.retry = setTimeout(() => void this.attach(true), 2000);
          }
        });
        this.stream = cs;
        return;
      } catch (e) {
        console.warn(`[feed:${this.opts.name}] watch failed → poll`, e);
      }
    }
    this.timer = setInterval(() => {
      if (this.polling || !database.ready) return;
      this.polling = true;
      this.opts
        .poll()
        .catch((e) => console.warn(`[feed:${this.opts.name}] poll`, e))
        .finally(() => (this.polling = false));
    }, this.opts.pollMs);
  }
}
