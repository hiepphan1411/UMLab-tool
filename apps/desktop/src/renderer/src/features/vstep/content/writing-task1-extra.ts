// Task 1: template của người học (đã nhận xét + chỉnh cho có chiến thuật) và cách nhận biết loại thư từ đề.
import { md, type DocSection } from './types';

/** Thụt lề chuỗi chèn vào md`` cho khớp lề của template (để md bỏ lề chung đúng). */
const NL = String.fromCharCode(10);
const ind = (s: string, n = 6) => s.split(NL).join(NL + ' '.repeat(n));

export const MY_INFORMAL = `Dear [Tên người nhận],

I was absolutely thrilled to receive your email. How have you been lately? I hope everything is going well with you and your family. I'm writing to [tell you about / invite you to / give you some advice on] [chủ đề của đề].

To begin with, [từ khoá ý 1 lấy từ đề] - [trả lời ý 1]. This is because [lý do / chi tiết].

Furthermore, you also asked me about [từ khoá ý 2]. Well, I think that [trả lời ý 2]. For example, [ví dụ ngắn].

Finally, [từ khoá ý 3]: [trả lời ý 3]. If I were you, I would [lời khuyên / đề nghị].

Anyway, I have to get back to my studies now. If you need any further information, feel free to ask me. I'm looking forward to hearing from you soon.

Best wishes,
[Tên của bạn]`;

export const MY_FORMAL = `Dear [Sir or Madam / Mr / Ms + Họ],

I hope this email finds you well. I am writing to [express my concern regarding / inquire about / apply for / request] [chủ đề của đề].

To begin with, regarding [từ khoá ý 1], [trả lời ý 1 - kèm chi tiết: ngày, nơi, con số].

Furthermore, with reference to [từ khoá ý 2], I would like to explain that [trả lời ý 2]. As a result, [hệ quả / lý do].

Finally, in response to [từ khoá ý 3], I would be grateful if you could [yêu cầu cụ thể].

Should you require any further information, please do not hesitate to contact me. I look forward to hearing from you.

Yours faithfully, (Dear Sir or Madam) / Yours sincerely, (Dear Mr/Ms + Họ)
[Họ và tên đầy đủ]`;

export const WRITING_T1_EXTRA: DocSection[] = [
  {
    id: 'w2-mytpl',
    title: '2.1. Template của bạn: nhận xét và bản đã chỉnh',
    body: md`
      **Kết luận: 2 template bạn đang học phù hợp với VSTEP** - đủ 5 phần (chào → mục đích → 3 ý → kết → ký tên), có từ nối rõ (*To begin with, Furthermore, Finally*), câu mẫu đúng ngữ pháp, đủ trang trọng/thân mật đúng chỗ. Tôi giữ nguyên khung của bạn, chỉ chỉnh 6 điểm cho "có chiến thuật" hơn:

      | # | Chỗ chỉnh | Vì sao |
      |---|---|---|
      | 1 | Thư thân mật: *I am writing this email to tell you about* → **I'm writing to [tell you about / invite you to / give you some advice on]** | Thân mật nên viết tắt; và đề không phải lúc nào cũng "kể" - có đề mời, khuyên, cảm ơn. Chọn động từ theo đề. |
      | 2 | *regarding your first question* → **[từ khoá ý 1 lấy từ đề]** | Đề Task 1 thường là **yêu cầu** (*describe, invite, tell…*), không phải câu hỏi. **Chép lại từ khoá của đề** vào đầu mỗi đoạn → giám khảo thấy ngay bạn trả lời đủ ý (tiêu chí 1). |
      | 3 | Mỗi ý thêm **1 câu lý do/ví dụ** (*This is because… / For example…*) | 1–2 câu/ý thường chỉ ~90 từ, **thiếu 120 từ**. Thêm 1 câu là đủ ~130 từ. |
      | 4 | Ý 3 thân mật thêm **If I were you, I would…** | Có 1 câu điều kiện loại 2 → "ăn điểm" ngữ pháp, rất hợp đề xin lời khuyên. |
      | 5 | *Warm regards* → **Best wishes** (thân mật) | *Warm regards* hơi xã giao; với bạn bè dùng *Best wishes / Love / Take care*. |
      | 6 | Thư trang trọng: *I look forward to receiving your prompt response* → **I look forward to hearing from you** (hoặc giữ *prompt response* khi **phàn nàn**) | *prompt* (nhanh chóng) nghe như thúc giục - chỉ hợp thư khiếu nại. Thêm câu **I would be grateful if you could…** ở ý cuối để có yêu cầu cụ thể. |

      ~~~template Thư thân mật (Informal) - bản đã chỉnh
      ${ind(MY_INFORMAL)}
      ~~~

      ~~~template Thư trang trọng (Formal) - bản đã chỉnh
      ${ind(MY_FORMAL)}
      ~~~

      ~~~note Bảng so sánh mấu chốt để không nhầm
      | Vị trí | Thân mật (Informal) | Trang trọng (Formal) |
      |---|---|---|
      | Chào | Dear Alex, / Hi Jane, | Dear Sir or Madam, / Dear Mr Smith, |
      | Mở bài | Hỏi thăm: *How have you been lately?* | Vào thẳng mục đích: *I am writing to…* |
      | Dẫn ý | *you also asked me about…* | *with reference to… / in response to…* |
      | Viết tắt | Được: *I'm, don't, can't* | **Không**: *I am, do not, cannot* |
      | Kết | *Anyway, I have to get back to…* | *Should you require any further information…* |
      | Ký tên | *Best wishes,* + tên (Hiep) | *Yours faithfully/sincerely,* + họ tên (Phan Phuoc Hiep) |
      ~~~

      Nút **Chèn template** trong mục Luyện viết đã dùng đúng 2 bản này.
    `,
  },
  {
    id: 'w2-identify',
    title: '2.2. Đọc đề: nhận biết loại thư và hiểu yêu cầu',
    body: md`
      **3 bước trong 1 phút đầu:**

      1. **Người nhận là ai?** → quyết định giọng văn.
      2. **Viết để làm gì?** → chọn câu mở (_invite, complain, apply, ask for…_).
      3. **Đề yêu cầu mấy ý?** → đánh số 1, 2, 3 cạnh các gạch đầu dòng; mỗi ý = 1 đoạn.

      | Dấu hiệu trong đề                                                                     | Loại thư                                                               | Ví dụ                                         |
      | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
      | **friend, cousin, pen pal, classmate**, gọi bằng **tên riêng** (Alex, Jane)           | **Thân mật**                                                           | _Your friend Alex has written to you…_        |
      | **manager, director, editor, company, hotel, travel agency, organiser, Sir or Madam** | **Trang trọng**                                                        | _Write a letter to the manager of the hotel…_ |
      | **teacher, professor, landlord, neighbour, boss, colleague** (biết nhưng không thân)  | **Trang trọng nhẹ** (dùng template trang trọng, có thể _Best regards_) | _Write to your landlord, Mr Peterson…_        |
      | Không rõ                                                                              | → Dùng **trang trọng** (an toàn hơn)                                   |                                               |

      ~~~vocab Từ hay gặp trong đề Task 1 (hiểu đúng để không lạc đề)
      reply to | /rɪˈplaɪ tə/ | v | trả lời (thư) | Write a reply to Alex.
      in your letter, you should | | phr | trong thư bạn cần | (liệt kê các ý phải có)
      describe | /dɪˈskraɪb/ | v | mô tả | describe your hometown
      explain why | /ɪkˈspleɪn waɪ/ | phr | giải thích lý do | explain why you chose it
      suggest | /səˈdʒest/ | v | gợi ý, đề xuất | suggest some activities
      give details of | | phr | nêu chi tiết về | give details of the tour
      ask for information about | | phr | hỏi thông tin về | ask for information about the course
      apologise for | /əˈpɒlədʒaɪz fə/ | v | xin lỗi vì | apologise for missing the party
      complain about | /kəmˈpleɪn əˈbaʊt/ | v | phàn nàn về | complain about the service
      request | /rɪˈkwest/ | v | đề nghị, yêu cầu | request a refund
      recommend | /ˌrekəˈmend/ | v | giới thiệu, khuyên | recommend a place to visit
      invite | /ɪnˈvaɪt/ | v | mời | invite Alex to your party
      accept / decline an invitation | | phr | nhận / từ chối lời mời | decline the invitation politely
      arrangements | /əˈreɪndʒmənts/ | n | sự sắp xếp | make arrangements to meet
      deposit | /dɪˈpɒzɪt/ | n | tiền đặt cọc | get your deposit back
      what action you want | | phr | bạn muốn họ làm gì | (→ yêu cầu bồi thường, đổi, hoàn tiền)
      ~~~

      ~~~sample Phân tích 1 đề mẫu
      **Đề:** You recently stayed at a hotel and left your bag there. Write a letter to the hotel manager. In your letter, you should: (1) give details of your stay, (2) describe the bag and what was in it, (3) say what you want the manager to do.

      - **Người nhận:** hotel manager → **trang trọng**, *Dear Sir or Madam* → *Yours faithfully*.
      - **Mục đích:** nhờ tìm và gửi lại túi → mở: *I am writing to inquire about a bag I left at your hotel.*
      - **Ý 1** (ngày, phòng): *I stayed in room 305 from 2nd to 4th November.*
      - **Ý 2** (mô tả túi): *It is a small black backpack containing my laptop and a blue notebook.*
      - **Ý 3** (yêu cầu): *I would be grateful if you could send it to my address in Hoc Mon District, Ho Chi Minh City.*
      ---
      Người nhận là quản lý khách sạn nên viết trang trọng. Mỗi gạch đầu dòng của đề thành 1 đoạn, mở đoạn bằng từ khoá của đề (stay, bag, what you want).
      ~~~
    `,
  },
];
