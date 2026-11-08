// Nhận dạng chữ (OCR) bằng engine có sẵn của Windows 10/11 (Windows.Media.Ocr) qua PowerShell - không cần cài thêm.
// Dùng cho công cụ "chọn vùng lấy chữ" trên trang sách scan / PDF scan.
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paths } from './config';
import { fail, newId } from './util';

const SCRIPT =
  String.raw`param([string]$img)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` +
  '`' +
  String.raw`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(); $task.Result }
$engine = $null
try { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language 'en-US')) } catch {}
if ($null -eq $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
if ($null -eq $engine) { Write-Error 'NO_ENGINE'; exit 2 }
$f = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($img)) ([Windows.Storage.StorageFile])
$s = Await ($f.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$dec = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($s)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bmp = Await ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$r = Await ($engine.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
$s.Dispose()
($r.Lines | ForEach-Object { $_.Text }) -join [Environment]::NewLine
`;

let scriptFile: string | null = null;

function ensureScript(): string {
  if (scriptFile && existsSync(scriptFile)) return scriptFile;
  const dir = join(paths.root, 'vstep');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  scriptFile = join(dir, 'ocr-v1.ps1');
  // BOM để PowerShell 5.1 đọc đúng UTF-8
  writeFileSync(scriptFile, '\uFEFF' + SCRIPT, 'utf8');
  return scriptFile;
}

/** Ảnh PNG (bytes) → chữ nhận dạng được (mỗi dòng một dòng). */
export async function ocrImage(png: Uint8Array): Promise<string> {
  if (process.platform !== 'win32') fail('VALIDATION', 'Lấy chữ từ ảnh chỉ hỗ trợ trên Windows.');
  if (png.byteLength > 15 * 1024 * 1024) fail('VALIDATION', 'Vùng chọn quá lớn.');
  const img = join(tmpdir(), `umlab-ocr-${newId('o', 8)}.png`);
  writeFileSync(img, png);
  try {
    return await new Promise<string>((resolve, reject) => {
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ensureScript(), img],
        { timeout: 25_000, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) reject(new Error(/NO_ENGINE/.test(stderr) ? 'NO_ENGINE' : stderr || err.message));
          else resolve(stdout.replace(/^\uFEFF/, '').trim());
        },
      );
    });
  } catch (e) {
    if ((e as Error).message === 'NO_ENGINE')
      fail('VALIDATION', 'Windows chưa có gói nhận dạng chữ tiếng Anh (Cài đặt → Ngôn ngữ → English → OCR).');
    fail('INTERNAL', 'Không nhận dạng được chữ: ' + (e as Error).message.slice(0, 200));
    return '';
  } finally {
    rmSync(img, { force: true });
  }
}
