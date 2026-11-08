// Mục lục sách "Ôn tổng hợp VSTEP bậc 3 (B1)" theo kỹ năng: trang lý thuyết/bài tập (số trang PDF = số trang in),
// trang đáp án trong tệp "Scripts và Keys", và phần giải thích + mẹo rút ra (viết thêm, hiện trong ngăn kéo).
import { md } from './types';

export type BookSkill = 'listening' | 'reading' | 'writing' | 'speaking';

export interface BookSection {
  id: string;
  title: string;
  /** Nhóm (phần) để hiện tiêu đề trong danh sách. */
  group: string;
  from: number;
  to: number;
  /** Trang đáp án/lời thoại gợi ý trong tệp Keys. */
  keys: number;
  guide: string;
}

export const BOOK_KEYS: Record<BookSkill, [number, number]> = {
  listening: [2, 53],
  reading: [54, 57],
  writing: [58, 72],
  speaking: [73, 88],
};

const S = (
  id: string,
  group: string,
  title: string,
  from: number,
  to: number,
  keys: number,
  guide: string,
): BookSection => ({
  id,
  group,
  title,
  from,
  to,
  keys,
  guide,
});

export const BOOK: Record<BookSkill, BookSection[]> = {
  listening: [
    S(
      'bl-book',
      'Tổng quan',
      'Giới thiệu sách: khung năng lực, định dạng đề B1, cách tính điểm',
      5,
      23,
      2,
      md`
        **Sách nói gì:** khung tham chiếu châu Âu (CEFR) và khung năng lực 6 bậc của Việt Nam (bậc 3 = B1), đặc tả từng kỹ năng, **định dạng đề bậc 3** (tr. 16), **cách tính điểm và mô tả năng lực ứng với điểm thi** (tr. 19), cách dùng sách và **lưu ý quan trọng** (tr. 22).

        ~~~note Những điều cần nhớ từ phần giới thiệu
        - Đề VSTEP bậc 3–5 dùng **chung một đề**, điểm từng kỹ năng 0–10; **trung bình ≥ 4,0 là đạt B1**.
        - Nghe/Đọc chấm theo số câu đúng; Viết/Nói chấm theo tiêu chí (hoàn thành yêu cầu, tổ chức, từ vựng, ngữ pháp, phát âm/trôi chảy).
        - Sách có 3 loại bài: **trọng tâm ngôn ngữ** (từ vựng, ngữ pháp), **bài tập thực hành** từng dạng câu hỏi, **bài tập dạng thức VSTEP** (giống đề thật) - nên làm loại cuối như thi thật, có canh giờ.
        ~~~

        ~~~tip Mẹo rút ra
        Đọc kỹ trang 16 (định dạng đề) một lần, đối chiếu với tab **Tài liệu** của từng kỹ năng trong app; sau đó dành thời gian cho bài tập, không học thuộc phần giới thiệu.
        ~~~
      `,
    ),
    S(
      'bl-intro',
      'Tổng quan',
      'Giới thiệu môn Nghe',
      24,
      25,
      2,
      md`
        **Sách nói gì:** bài Nghe có 3 phần, 35 câu, nghe một lần. Sách chia luyện theo **dạng câu hỏi** chứ không theo đề: Phần 1 (câu hỏi tổng quan, chi tiết, từ đánh lạc hướng), Phần 2&3 (ý chính, mục đích, chi tiết, diễn đạt khác), Phần mở rộng (suy luận, mục đích câu nói).

        **Cách dùng sách hiệu quả:** mỗi bài làm theo 3 bước - (1) đọc câu hỏi, gạch từ khoá; (2) nghe 1 lần chọn đáp án; (3) mở lời thoại, gạch câu chứa đáp án và tìm **cách nói khác** giữa lời thoại và lựa chọn đúng. Bước 3 mới là bước lên điểm.

        ~~~tip Mẹo rút ra
        Học theo dạng câu hỏi giúp bạn **đoán trước cần nghe gì**: Where → nghe từ chỉ nơi chốn, Why → nghe because/so, What… next → nghe câu cuối.
        ~~~
      `,
    ),
    S(
      'bl-where',
      'Phần 1 – Câu hỏi tổng quan',
      'A. Câu hỏi về địa điểm',
      26,
      28,
      2,
      md`
        **Lý thuyết sách:** địa điểm hiếm khi được nói thẳng. Hãy nghe **các từ liên quan** (middle seat, stage, lighting → nhà hát) rồi suy ra; nhưng không chọn chỉ vì nghe 1 từ, vì một từ có thể hợp nhiều nơi.

        **Giải thích ví dụ trong sách:** "soundtrack… realistic… being home on a rainy day" → họ đang ở **nhà** nghe đĩa âm thanh, nên chọn _In their living room_; _beach_ và _rainy street_ là từ nghe thấy nhưng là bẫy.

        **Bài EX1 (track 01):** câu 1 "going up… which floor" → **thang máy**; câu 2 "need a computer… what kind… sell all kinds" → **cửa hàng máy tính** (bakery chỉ là nơi anh ấy làm việc); câu 3 "book a place on our tour… press 1" → **công ty du lịch**; câu 4 "reservations… a table… seat you" → **nhà hàng**; câu 5 "Attention, shoppers… sporting goods department… customer service counter" → **cửa hàng bách hoá**.

        ~~~tip Mẹo rút ra
        - Gom **2–3 từ khoá** rồi mới chọn. Một từ đơn lẻ thường là bẫy.
        - Thông báo mở đầu bằng *Attention, shoppers / passengers / visitors* đã cho luôn địa điểm.
        - Lựa chọn chứa đúng từ bạn nghe thấy (*beach, bakery*) thường **sai**.
        ~~~
      `,
    ),
    S(
      'bl-who',
      'Phần 1 – Câu hỏi tổng quan',
      'B. Câu hỏi về người nói/người nghe',
      29,
      31,
      3,
      md`
        **Lý thuyết sách:** câu hỏi _Who is the man? What is the woman's job?_ - nghề nghiệp ít khi được nói ra. Nghe **từ vựng gắn với công việc**: captain, seat belt sign, overhead compartment → tiếp viên hàng không (có nhắc "captain" nên không phải phi công).

        **Bài EX2 (track 02):** "ahead in the polls… campaign" → **chính trị gia**; "perform tonight… play bass… trumpet" → **nhạc công**; "Front desk… suit cleaned and pressed… your room" → **lễ tân khách sạn**; "made your hotel reservations, reconfirmed your flights… car and driver" → **nhân viên đại lý du lịch**.

        ~~~vocab Từ khoá → nghề
        prescription | /prɪˈskrɪpʃn/ | n | đơn thuốc | → pharmacist, doctor
        invoice | /ˈɪnvɔɪs/ | n | hoá đơn | → accountant
        deadline, article | | n | hạn chót, bài báo | → journalist
        patient, symptom | | n | bệnh nhân, triệu chứng | → doctor, nurse
        lecture, assignment | | n | bài giảng, bài tập | → lecturer, student
        ~~~

        ~~~tip Mẹo rút ra
        Hỏi "người **thứ nhất**" hay "người **phụ nữ**" thì chỉ tập trung vào lời của người đó. Người kia thường là khách hàng.
        ~~~
      `,
    ),
    S(
      'bl-topic',
      'Phần 1 – Câu hỏi tổng quan',
      'C. Câu hỏi về chủ đề/mục đích',
      32,
      34,
      4,
      md`
        **Lý thuyết sách:** _What is the talk mainly about? What is the purpose of the announcement?_ - câu trả lời nằm ở **1–2 câu đầu**. Tin nhắn thoại/quảng cáo: nghe _I'm calling to… / This is to remind… / Are you tired of…?_

        **Ví dụ trong sách (quảng cáo Translingua):** "need to know a language for business but too busy to take classes? Then order a language kit…" → mục đích: **quảng cáo bộ học ngoại ngữ tại nhà**.

        ~~~tip Mẹo rút ra
        - Đáp án chủ đề phải **bao trùm cả đoạn**; loại lựa chọn chỉ nói một chi tiết nhỏ.
        - Quảng cáo luôn có cấu trúc: vấn đề (*Are you…?*) → sản phẩm (*Then try…*) → lợi ích.
        ~~~
      `,
    ),
    S(
      'bl-activity',
      'Phần 1 – Câu hỏi tổng quan',
      'D. Câu hỏi về hoạt động',
      35,
      40,
      4,
      md`
        **Lý thuyết sách:** _What are the speakers doing? What will the woman probably do next?_ - "doing" nghe toàn đoạn; "**do next**" nghe **câu cuối** (I'll…, Let me…, I'm going to…, Why don't we…).

        **EX4–EX7 (track 04–07):** mỗi đoạn đều có câu kết nói về hành động sắp làm, ví dụ "I'll call the travel agent right away" → _call a travel agent_.

        ~~~tip Mẹo rút ra
        Hành động sắp làm thường được **diễn đạt lại**: "I'll grab a cab" → *take a taxi*; "Let me check the schedule" → *look at the timetable*.
        ~~~
      `,
    ),
    S(
      'bl-time',
      'Phần 1 – Câu hỏi chi tiết',
      'A–B. Thời gian và địa điểm cụ thể',
      41,
      44,
      5,
      md`
        **Lý thuyết sách:** câu chi tiết luôn có **nhiều thông tin cùng loại gây nhiễu** (2–3 mốc giờ, 2–3 nơi). Thông tin đúng thường là cái **được nhắc sau cùng** hoặc sau từ đổi ý.

        **Mẹo ghi nháp:** viết nhanh các số nghe được, gạch số bị huỷ: "_The meeting was at 2, but it's been moved to 3:30_" → 3:30.

        ~~~vocab Dễ nhầm
        thirteen / thirty | /ˌθɜːˈtiːn/ – /ˈθɜːti/ | num | 13 / 30 | -teen nhấn âm sau, -ty nhấn âm trước
        a quarter to | | phr | kém 15 | a quarter to six = 5:45
        opposite | /ˈɒpəzɪt/ | prep | đối diện | opposite the bank
        next to | | prep | bên cạnh | next to the lift
        ~~~
      `,
    ),
    S(
      'bl-why',
      'Phần 1 – Câu hỏi chi tiết',
      'C–D. Lý do; yêu cầu, đề nghị, hướng dẫn',
      45,
      50,
      6,
      md`
        **Lý thuyết sách:** _Why…?_ nghe sau **because, since, as, due to, so**. _What does the man ask/suggest?_ nghe câu **Could you / Would you mind / Why don't you / I suggest / Make sure**.

        ~~~tip Mẹo rút ra
        - Lý do thường được nói lại: "I've got a terrible headache" → *He is not feeling well*.
        - Câu hỏi về **người đàn ông yêu cầu** → đáp án nằm trong lời người đàn ông, không phải người phụ nữ.
        - "*Would you mind…?*" trả lời "Not at all" = **đồng ý**.
        ~~~
      `,
    ),
    S(
      'bl-distract',
      'Phần 1 – Từ đánh lạc hướng',
      'Âm tương tự, đồng âm, trái nghĩa',
      51,
      60,
      7,
      md`
        **Lý thuyết sách:** 4 kiểu bẫy - (1) **từ âm tương tự** (walk/work, coffee/copy), (2) **đồng âm khác nghĩa** (right/write, sale/sail), (3) **đồng âm cùng cách viết, khác nghĩa** (book a table / a book), (4) **từ trái nghĩa/phủ định** (_not expensive at all_ → lựa chọn "expensive" sai).

        **Cách luyện track 15–19:** sau khi nghe, mở lời thoại và đánh dấu từ nào trong lựa chọn sai **giống âm** với từ trong bài - bạn sẽ thấy người ra đề cố ý làm vậy.

        ~~~tip Mẹo rút ra
        So **nghĩa cả câu**, không so âm. Lựa chọn lặp y nguyên một từ của bài mà nghĩa cả câu khác → loại ngay.
        ~~~
      `,
    ),
    S(
      'bl-main',
      'Phần 2 & 3',
      'Nhận biết ý chính',
      61,
      70,
      29,
      md`
        **Lý thuyết sách:** ý chính là điều **cả đoạn xoay quanh**, thường nằm ở 2–3 lượt lời đầu và được nhắc lại. Sách cho bài tập gạch **từ khoá** (danh từ, động từ chính) rồi tóm tắt bằng 1 câu.

        **Cách loại:** lựa chọn quá hẹp (một chi tiết), quá rộng (chung chung hơn bài), hoặc nói điều không có.

        ~~~tip Mẹo rút ra
        Nghe 30 giây đầu thật kỹ, tự trả lời "họ đang bàn về cái gì?" trước khi nhìn lựa chọn.
        ~~~
      `,
    ),
    S(
      'bl-purpose',
      'Phần 2 & 3',
      'Nhận biết mục đích chính',
      71,
      77,
      32,
      md`
        **Lý thuyết sách:** _Why is the woman calling? What is the purpose of the talk?_ - tìm **từ khoá + chi tiết** cho mục đích (sách L2.2 EX1). Câu báo mục đích: _I'm calling about…, I'd like to…, The reason I'm here…, I was wondering if…_

        **Bài dạng thức VSTEP (track 37):** đọc trước 4 câu hỏi, câu 1 luôn là mục đích → nghe lượt lời đầu của người gọi.

        ~~~tip Mẹo rút ra
        *I was wondering if I could…* = lời xin phép lịch sự → mục đích là **xin/đề nghị** điều gì đó.
        ~~~
      `,
    ),
    S(
      'bl-detail',
      'Phần 2 & 3',
      'Nhận biết chi tiết',
      78,
      83,
      37,
      md`
        **Lý thuyết sách:** đọc câu hỏi tìm **từ khoá không đổi** (tên riêng, số, năm) để biết đáp án sắp tới; câu hỏi đi theo thứ tự bài nghe.

        ~~~tip Mẹo rút ra
        Lỡ một câu chi tiết → bỏ ngay, nghe câu sau. Các câu độc lập, tiếc câu cũ sẽ mất câu mới.
        ~~~
      `,
    ),
    S(
      'bl-para',
      'Phần 2 & 3',
      'Nhận biết cách diễn đạt khác',
      84,
      90,
      40,
      md`
        **Lý thuyết sách:** đáp án đúng gần như luôn **paraphrase** lời nói: đồng nghĩa (buy → purchase), đổi từ loại (decide → decision), đổi cấu trúc (It's too expensive → It costs more than she can afford).

        ~~~vocab Cặp diễn đạt khác hay gặp
        put off | | phr v | hoãn | = postpone, delay
        run out of | | phr v | hết | = there is no … left
        get in touch | | phr | liên lạc | = contact
        be fed up with | | phr | chán ngấy | = be tired of
        sold out | | adj | bán hết | = no tickets available
        ~~~
      `,
    ),
    S(
      'bl-infer',
      'Phần mở rộng',
      'Câu hỏi suy luận',
      91,
      102,
      45,
      md`
        **Lý thuyết sách:** _What can be inferred…? What does the man imply?_ - đáp án không nói thẳng nhưng **chắc chắn đúng** từ thông tin trong bài. "Tickets sold out in an hour" → _the event was popular_.

        ~~~tip Mẹo rút ra
        Chọn lựa chọn **gần bài nhất, ít suy diễn nhất**. Lựa chọn nghe hợp lý ngoài đời nhưng bài không có căn cứ → loại.
        ~~~
      `,
    ),
    S(
      'bl-function',
      'Phần mở rộng',
      'Câu hỏi mục đích/chức năng của diễn ngôn',
      103,
      111,
      50,
      md`
        **Lý thuyết sách:** _Why does the speaker say "…"?_ - xét **ngữ cảnh trước và sau** câu đó: người nói đang đưa ví dụ, nhấn mạnh, đổi chủ đề, xin lỗi, đùa hay bày tỏ ngạc nhiên?

        ~~~vocab Chức năng thường gặp
        to give an example | | phr | đưa ví dụ | For instance…, Take… for example
        to emphasise a point | | phr | nhấn mạnh | Believe it or not…, In fact…
        to change the topic | | phr | đổi chủ đề | Anyway…, Moving on…
        to express surprise | | phr | bày tỏ ngạc nhiên | Surprisingly…, Can you believe…
        ~~~
      `,
    ),
  ],
  reading: [
    S(
      'br-intro',
      'Tổng quan',
      'Giới thiệu môn Đọc',
      112,
      112,
      54,
      md`
        **Sách nói gì:** 4 bài đọc, 40 câu, 60 phút; sách luyện theo **5 dạng câu hỏi chính** (từ vựng, ý chính, chi tiết, phủ định, thông tin diễn đạt khác) và **2 dạng mở rộng** (mục đích, chèn câu).

        ~~~tip Cách học phần Đọc trong sách
        Mỗi bài: làm câu hỏi trước (có canh giờ ~12 phút/bài), chấm bằng tệp Keys (trang 54–57), rồi **viết lại câu chứa đáp án** cạnh lựa chọn đúng để thấy cách diễn đạt khác.
        ~~~
      `,
    ),
    S(
      'br-vocab',
      'Các dạng câu hỏi',
      'Câu hỏi từ vựng',
      113,
      124,
      54,
      md`
        **Lý thuyết sách:** đoán nghĩa từ bằng **ngữ cảnh**: định nghĩa ngay sau từ (_that is, or, which means_), từ đồng nghĩa/trái nghĩa gần đó (_but, unlike_), ví dụ (_such as_), và **gốc từ/tiền tố – hậu tố** (un-, re-, -less, -ful).

        ~~~vocab Tiền tố/hậu tố giúp đoán nghĩa
        un- / in- / dis- | | prefix | không, ngược lại | unhappy, incorrect, dislike
        re- | | prefix | lại | rebuild, reuse
        -less | | suffix | không có | careless, homeless
        -ful | | suffix | có nhiều | helpful, careful
        -able | | suffix | có thể | readable, affordable
        ~~~

        ~~~tip Mẹo rút ra
        Thay từng lựa chọn vào câu - lựa chọn giữ nguyên nghĩa là đáp án. Cẩn thận lựa chọn là **nghĩa phổ biến** của từ nhưng sai ngữ cảnh.
        ~~~
      `,
    ),
    S(
      'br-main',
      'Các dạng câu hỏi',
      'Câu hỏi tìm ý chính',
      125,
      132,
      54,
      md`
        **Lý thuyết sách:** ý chính nằm ở **câu chủ đề** (thường là câu đầu đoạn) và đoạn kết. Sách luyện gạch câu chủ đề từng đoạn rồi ghép thành ý chính cả bài.

        ~~~tip Mẹo rút ra
        Làm câu ý chính **sau cùng**; loại lựa chọn quá hẹp/quá rộng/không có trong bài.
        ~~~
      `,
    ),
    S(
      'br-detail',
      'Các dạng câu hỏi',
      'Câu hỏi chi tiết',
      133,
      146,
      55,
      md`
        **Lý thuyết sách:** **scanning** - quét tìm từ khoá (tên, số, năm, chữ in hoa) rồi đọc kỹ 2–3 câu quanh đó; đáp án thường dùng từ đồng nghĩa.

        ~~~tip Mẹo rút ra
        Đánh dấu trên bài vị trí từng câu hỏi; câu hỏi đi theo thứ tự đoạn văn nên đáp án câu sau nằm sau đáp án câu trước.
        ~~~
      `,
    ),
    S(
      'br-neg',
      'Các dạng câu hỏi',
      'Câu hỏi dạng phủ định (NOT/EXCEPT)',
      147,
      157,
      56,
      md`
        **Lý thuyết sách:** tìm đoạn liệt kê, **đánh dấu 3 lựa chọn có trong bài**, lựa chọn còn lại là đáp án. Lựa chọn sai thông tin cũng có thể là đáp án của câu NOT TRUE.

        ~~~warn
        Câu này tốn thời gian nhất - để làm sau nếu đang thiếu giờ.
        ~~~
      `,
    ),
    S(
      'br-para',
      'Các dạng câu hỏi',
      'Nhận biết thông tin diễn đạt theo cách khác',
      158,
      173,
      56,
      md`
        **Lý thuyết sách:** chọn câu giữ **đủ ý chính và đúng quan hệ logic** (nguyên nhân – kết quả, đối lập, điều kiện) của câu được tô đậm; loại câu thiếu ý quan trọng hoặc đổi quan hệ.

        ~~~tip Mẹo rút ra
        Gạch các từ nối trong câu gốc (*because, although, unless*) rồi kiểm tra lựa chọn có giữ đúng quan hệ đó không.
        ~~~
      `,
    ),
    S(
      'br-purpose',
      'Phần mở rộng',
      'Câu hỏi mục đích',
      174,
      184,
      57,
      md`
        **Lý thuyết sách:** _Why does the author mention X?_ - xem câu trước và sau X: tác giả đang **minh hoạ, so sánh, giải thích, phản bác** hay **đề xuất**?

        ~~~vocab Động từ mục đích
        illustrate | /ˈɪləstreɪt/ | v | minh hoạ |
        contrast | /kənˈtrɑːst/ | v | đối lập |
        support | /səˈpɔːt/ | v | củng cố |
        criticise | /ˈkrɪtɪsaɪz/ | v | phê phán |
        ~~~
      `,
    ),
    S(
      'br-insert',
      'Phần mở rộng',
      'Câu hỏi chèn câu vào văn bản',
      185,
      203,
      57,
      md`
        **Lý thuyết sách:** tìm **manh mối nối** trong câu cần chèn: đại từ (_this, they, such_), từ nối (_however, also, as a result_), từ chỉ thứ tự (_first, then_). Câu đó phải đứng **sau** câu mà nó nhắc tới.

        ~~~tip Mẹo rút ra
        Thử đặt câu vào từng vị trí [A]–[D] rồi đọc liền mạch: vị trí nào đọc trôi và đại từ có chỗ để chỉ là đúng.
        ~~~
      `,
    ),
  ],
  writing: [
    S(
      'bw-intro',
      'Tổng quan',
      'Giới thiệu môn Viết',
      204,
      204,
      58,
      md`
        **Sách nói gì:** Task 1 viết thư/email (~120 từ, 1/3 điểm), Task 2 bài luận (~250 từ, 2/3 điểm). Sách đi từ **viết thư 3 giọng văn** → **từ vựng & ngữ pháp học thuật** → **viết đoạn văn** → **viết bài luận**.

        ~~~tip Cách học phần Viết trong sách
        Đọc phần phân tích bài mẫu trong sách, sau đó viết lại bài theo **template của app** (Tài liệu Viết) và so với bài mẫu ở tệp Keys (trang 58–72).
        ~~~
      `,
    ),
    S(
      'bw-informal',
      'Viết thư/email',
      'Thư thân mật',
      206,
      207,
      58,
      md`
        **Lý thuyết sách:** viết cho bạn bè/người thân; được viết tắt, câu hỏi thăm, giọng gần gũi. Mở _Dear/Hi + tên_, kết _Best wishes / Love / Take care_.

        **Cách nhận ra đề thư thân mật:** người nhận là **friend, cousin, pen pal**, gọi bằng **tên riêng** (Alex, Jane); nội dung là kể, mời, khuyên, cảm ơn.

        ~~~tip Mẹo rút ra
        Bài mẫu sách (Keys tr.60 "Hi Harry… keep fit") dùng đúng khung: hỏi thăm → mục đích → từng ý → kết. Hãy chép khung đó và thay ý.
        ~~~
      `,
    ),
    S(
      'bw-formal',
      'Viết thư/email',
      'Thư trang trọng',
      208,
      211,
      58,
      md`
        **Lý thuyết sách:** viết cho công ty, nhà tuyển dụng, giáo sư, người lạ; **không viết tắt**, câu đầy đủ, đi thẳng vào mục đích. _Dear Sir or Madam_ → _Yours faithfully_; _Dear Mr/Ms + họ_ → _Yours sincerely_.

        **Bài mẫu sách (Keys tr.58):** thư xin việc gửi "Mr David Phan", mục đích "To apply for the job" - mở _I am interested in applying for…_, nêu bằng cấp _I have a BA degree awarded by…_.

        ~~~vocab Cụm trang trọng thay cho cụm thân mật
        I am writing to | | phr | tôi viết thư để | thay cho "I just want to tell you"
        I would be grateful if | | phr | tôi rất biết ơn nếu | thay cho "Can you…?"
        Please do not hesitate to contact me | | phr | xin đừng ngần ngại liên hệ | thay cho "Call me if…"
        ~~~
      `,
    ),
    S(
      'bw-semi',
      'Viết thư/email',
      'Thư nửa trang trọng',
      212,
      231,
      59,
      md`
        **Lý thuyết sách:** gửi người **biết nhưng không thân** (chủ nhà, thầy cô, hàng xóm, sếp): lịch sự nhưng nhẹ nhàng, có thể viết tắt vừa phải; _Dear Mr Peterson_ → _Best regards / Kind regards_.

        ~~~tip Mẹo rút ra
        Không chắc giọng nào → dùng **trang trọng**: viết trang trọng cho bạn chỉ hơi cứng, còn viết thân mật cho công ty là sai giọng (mất điểm tiêu chí 1).
        ~~~
      `,
    ),
    S(
      'bw-academic',
      'Bài tiểu luận',
      'Từ vựng học thuật & ngữ pháp chọn lọc',
      232,
      250,
      62,
      md`
        **Lý thuyết sách:** dùng từ học thuật thay từ đời thường (get → obtain, show → demonstrate, a lot of → a large number of) và ôn **hoà hợp chủ – vị**, câu bị động, mệnh đề quan hệ (Keys tr.62: bài tập _was/were_).

        ~~~vocab Đổi từ đời thường → học thuật
        get | → | v | obtain, gain | obtain information
        show | → | v | demonstrate, indicate | Studies indicate that…
        a lot of | → | phr | a large number of / a great deal of | a large number of students
        think | → | v | believe, consider | Many people believe that…
        big | → | adj | significant, considerable | a significant impact
        ~~~
      `,
    ),
    S(
      'bw-paragraph',
      'Bài tiểu luận',
      'Viết đoạn văn trong tiếng Anh',
      251,
      261,
      66,
      md`
        **Lý thuyết sách:** đoạn văn = **câu chủ đề** + **câu hỗ trợ** (giải thích, ví dụ) + **câu kết**; câu không liên quan phải bỏ (Keys tr.67: "unrelated sentence").

        ~~~tip Mẹo rút ra
        Mỗi đoạn thân bài theo **P-E-E**: Point (câu chủ đề) → Explain (because/This means) → Example (For example). Đủ 3 phần là khoảng 80–100 từ.
        ~~~
      `,
    ),
    S(
      'bw-essay',
      'Bài tiểu luận',
      'Viết bài tiểu luận: thành phần, các bước chuẩn bị, phân tích đề',
      262,
      297,
      68,
      md`
        **Lý thuyết sách:** bài luận gồm **mở bài (có thesis statement)** – **thân bài (mỗi đoạn một topic sentence)** – **kết bài**. Bước chuẩn bị: phân tích đề (Keys tr.68: gạch _traffic jams… causes… measures_), lập dàn ý, viết, soát lỗi.

        **Phân tích đề theo sách:** (a) chủ đề là gì; (b) đề hỏi gì (_causes? measures? opinion?_); (c) cần trả lời những phần nào → mỗi phần một đoạn thân bài.

        ~~~tip Mẹo rút ra
        Câu cuối mở bài (**thesis**) phải nói rõ bài sẽ bàn gì; giám khảo đọc câu này để chấm tiêu chí Hoàn thành yêu cầu.
        ~~~
      `,
    ),
  ],
  speaking: [
    S(
      'bs-intro',
      'Tổng quan',
      'Giới thiệu môn Nói',
      298,
      300,
      73,
      md`
        **Sách nói gì:** Part 1 giao tiếp xã hội, Part 2 thảo luận giải pháp, Part 3 phát triển chủ đề. Sách có **bài phát âm** (track 65–69), **ý tưởng & từ vựng theo chủ đề**, **ngữ pháp cần cho Part 1**, **bài mẫu** có audio (track 70–89).

        ~~~tip Cách học phần Nói trong sách
        Nghe bài mẫu (track), đọc to theo (shadowing) 3 lần, rồi thay thông tin của bạn vào (Hóc Môn, IUH, Tây Ninh…) và ghi âm ở mục Luyện nói.
        ~~~
      `,
    ),
    S(
      'bs-pron',
      'Phần 1 – Giao tiếp xã hội',
      'Một số vấn đề cơ bản về phát âm',
      302,
      305,
      73,
      md`
        **Lý thuyết sách:** âm cuối, đuôi **-s/-es** (/s/, /z/, /ɪz/), đuôi **-ed** (/t/, /d/, /ɪd/), trọng âm từ và **nối âm** (_an apple_ → /ə‿ˈnæpl/).

        **Bài tập (Keys tr.73):** sleep/leave/will… và họ từ biology → biological, environment → environmental, advantage → advantageous: **trọng âm đổi khi thêm hậu tố**.

        ~~~vocab Trọng âm đổi theo hậu tố
        biology | /baɪˈɒlədʒi/ | n | sinh học | → biological /ˌbaɪəˈlɒdʒɪkl/
        environment | /ɪnˈvaɪrənmənt/ | n | môi trường | → environmental /ɪnˌvaɪrənˈmentl/
        advantage | /ədˈvɑːntɪdʒ/ | n | lợi thế | → advantageous /ˌædvənˈteɪdʒəs/
        responsible | /rɪˈspɒnsəbl/ | adj | có trách nhiệm | → responsibility /rɪˌspɒnsəˈbɪləti/
        ~~~
      `,
    ),
    S(
      'bs-ideas',
      'Phần 1 – Giao tiếp xã hội',
      'Ý tưởng và từ vựng theo chủ đề',
      306,
      314,
      80,
      md`
        **Lý thuyết sách:** mỗi chủ đề Part 1 (bản thân, gia đình, quê hương, sở thích, công việc…) có sẵn ý + từ vựng. Bài mẫu Keys tr.80: "I work for a Vietnamese car maker…" - nói **cụ thể** (tên công ty, việc làm) nghe tự nhiên hơn.

        ~~~tip Mẹo rút ra
        Chuẩn bị sẵn "hồ sơ bản thân" bằng tiếng Anh: tên, tuổi, nơi sống (*Hoc Mon district, Ho Chi Minh City*), trường (*Industrial University of Ho Chi Minh City*), quê (*Tay Ninh province*), ngành học, sở thích - dùng lại cho mọi câu Part 1.
        ~~~
      `,
    ),
    S(
      'bs-grammar',
      'Phần 1 – Giao tiếp xã hội',
      'Ngữ pháp cần thiết + bài mẫu Part 1',
      315,
      324,
      81,
      md`
        **Lý thuyết sách:** thì hiện tại đơn (thói quen), quá khứ đơn (kể chuyện), hiện tại hoàn thành (_I have lived here for…_), câu so sánh, _would like / be going to_ cho dự định.

        ~~~tip Mẹo rút ra
        Nghe câu hỏi dùng thì gì → trả lời đúng thì đó: *Did you…?* → quá khứ; *Have you ever…?* → *Yes, I have. I… (quá khứ)*; *Will you / Would you like…?* → *I'd like to… / I'm going to…*
        ~~~
      `,
    ),
    S(
      'bs-part2',
      'Phần 2 – Thảo luận giải pháp',
      'Cách tiếp cận, cách diễn đạt, ghi chú ý tưởng, bài mẫu',
      325,
      340,
      82,
      md`
        **Lý thuyết sách:** chọn 1 phương án → **2–3 lý do** → nói vì sao **không chọn** 2 phương án còn lại. Ghi chú 1 phút bằng **từ khoá**, không viết câu. Cụm diễn đạt: _In my opinion, the best option is… / I wouldn't choose… because…_

        ~~~tip Mẹo rút ra
        Chọn phương án **dễ nói nhất**, không cần "đúng nhất". Bảng ghi chú nhanh: A ✓ (lý do 1, lý do 2) - B ✗ (1 lý do) - C ✗ (1 lý do).
        ~~~
      `,
    ),
    S(
      'bs-part3',
      'Phần 3 – Phát triển chủ đề',
      'Cách tiếp cận, paraphrasing, câu hỏi gợi ý, bài mẫu',
      341,
      366,
      84,
      md`
        **Lý thuyết sách:** dùng 3 ý trong sơ đồ + 1 ý riêng; **paraphrase** chủ đề ở câu mở đầu; trả lời câu hỏi follow-up ngắn gọn có lý do. Sách có danh sách câu hỏi tham khảo để luyện phản xạ.

        ~~~tip Mẹo rút ra
        Câu mở: *I'd like to talk about…* + nhắc lại 3 ý → giám khảo thấy ngay bố cục. Mỗi ý: lý do + ví dụ của chính bạn (ở IUH, ở Hóc Môn, ở quê Tây Ninh).
        ~~~
      `,
    ),
  ],
};

/** Mục sách chứa trang `page`. */
export function sectionOfPage(skill: BookSkill, page: number): BookSection | undefined {
  return BOOK[skill].find((s) => page >= s.from && page <= s.to);
}
