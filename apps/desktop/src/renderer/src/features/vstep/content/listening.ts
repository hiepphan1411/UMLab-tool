import { md, type VDoc } from './types';

export const listeningDoc: VDoc = {
  id: 'listening',
  title: 'Kỹ năng Nghe (Listening)',
  subtitle: '3 phần, 35 câu, khoảng 40 phút, nghe 1 lần',
  parts: [
    {
      id: 'l1',
      title: 'Phần 1. Tổng quan bài thi Nghe',
      sections: [
        {
          id: 'l1-structure',
          title: '1.1. Cấu trúc đề',
          body: md`
            Bài thi Nghe VSTEP (bậc 3–5) dùng **một đề chung** cho mọi trình độ; điểm của bạn quyết định bậc. Đề gồm 3 phần, **35 câu trắc nghiệm 4 lựa chọn (A, B, C, D)**, thời gian khoảng **40 phút** (đã gồm thời gian đọc câu hỏi và chuyển đáp án). Mỗi đoạn chỉ được nghe **một lần**.

            | Phần   | Số câu         | Dạng bài nghe                                            | Nội dung câu hỏi                                                     |
            | ------ | -------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
            | Part 1 | 8 câu (1–8)    | 8 thông báo, hướng dẫn, tin nhắn hoặc hội thoại rất ngắn | Mỗi đoạn 1 câu hỏi: địa điểm, người nói, mục đích, thời gian, lý do… |
            | Part 2 | 12 câu (9–20)  | 3 đoạn hội thoại dài (2–3 người)                         | Mỗi đoạn 4 câu: ý chính, mục đích, chi tiết, cách nói khác           |
            | Part 3 | 15 câu (21–35) | 3 bài nói/bài giảng (talk, lecture)                      | Mỗi bài 5 câu: ý chính, chi tiết, suy luận, mục đích của một câu nói |

            - Câu hỏi và 4 lựa chọn **được in sẵn trên màn hình/đề**; trước mỗi đoạn có vài giây để đọc.
            - Giọng đọc đa dạng: Anh – Mỹ – Úc; tốc độ tự nhiên, Part 3 nhanh và dài nhất.
            - **Không trừ điểm câu sai** → không bao giờ để trống.
            - Hiện nay phần lớn hội đồng thi tổ chức **thi trên máy tính**: đeo tai nghe, bấm chọn đáp án ngay trên màn hình.

            ~~~note Ghi nhớ nhanh
            **8 – 12 – 15**: Part 1 có 8 câu, Part 2 có 12 câu, Part 3 có 15 câu. Part 1 + Part 2 = 20 câu "dễ ăn" nhất.
            ~~~
          `,
        },
        {
          id: 'l1-score',
          title: '1.2. Điểm số và mục tiêu cho B1',
          body: md`
            Mỗi kỹ năng chấm thang **0–10**, làm tròn 0,5. Điểm tổng = trung bình 4 kỹ năng. **B1 cần điểm tổng 4,0–5,5**, B2 cần 6,0–8,0. Nghe không cần cao nếu Viết và Nói tốt nhờ template.

            Quy đổi ước tính (tuyến tính, chỉ để tự đánh giá — hội đồng không công bố bảng cố định):

            | Số câu đúng / 35 | Điểm ước tính | Nhận xét                           |
            | ---------------- | ------------- | ---------------------------------- |
            | 11–12            | 3,0–3,5       | Chưa đủ, cần Viết/Nói bù nhiều     |
            | **14**           | **4,0**       | Ngưỡng tối thiểu nên đạt           |
            | **16**           | **4,5**       | Mục tiêu an toàn cho người mất gốc |
            | 18               | 5,0           | Tốt, dư điểm cho kỹ năng yếu       |
            | 21               | 6,0           | Mức B2                             |

            ~~~tip Kế hoạch lấy 16/35 câu
            - Part 1: đúng **5/8** (câu ngắn, có từ khoá rõ).
            - Part 2: đúng **6/12** (mỗi đoạn hội thoại ăn 2 câu: câu ý chính + 1 câu chi tiết).
            - Part 3: đúng **4/15** (câu hỏi đầu bài thường hỏi chủ đề; còn lại đoán theo mẹo).
            - Cộng thêm điểm "đoán may" từ những câu bỏ: trung bình 1/4 số câu đoán là đúng.
            ~~~
          `,
        },
        {
          id: 'l1-tips',
          title: '1.3. Mẹo chung cho cả bài Nghe',
          body: md`
            1. **Đọc câu hỏi trước, gạch từ để hỏi** (Where, Who, Why, What… do, When). Từ để hỏi cho biết phải nghe thông tin gì.
            2. **Gạch 1–2 từ khoá** trong câu hỏi và lựa chọn, đoán trước nội dung. Ví dụ đọc "Why is the woman calling?" → chờ nghe _I'm calling to… / I'd like to…_.
            3. **Đáp án đúng thường được nói theo cách khác (paraphrase)**: bài nói "_the meeting has been_ **put off**" → đáp án "_The meeting was_ **postponed**".
            4. **Cẩn thận lựa chọn lặp lại đúng từ nghe được** — đó thường là bẫy. Từ nghe thấy y nguyên ≠ đáp án đúng.
            5. **Nghe hết câu, chú ý từ đổi ý**: _but, however, actually, unfortunately, I'm afraid, instead_. Thông tin sau các từ này thường là đáp án.
            6. **Lỡ một câu thì bỏ ngay**, chọn tạm một đáp án và chuyển sang câu tiếp theo. Tiếc câu cũ sẽ mất luôn câu sau.
            7. **Không để trống**: những câu không nghe được, chọn cùng một chữ cái (ví dụ luôn chọn B).
            8. **Giọng Anh – Mỹ khác nhau**: _can't_ /kɑːnt/ (Anh) – /kænt/ (Mỹ); _schedule_ /ˈʃedjuːl/ – /ˈskedʒuːl/; _water_ /ˈwɔːtə/ – /ˈwɑːt̬ɚ/.

            ~~~say Câu dẫn hay gặp ngay trước đáp án
            I'm calling to let you know that… | Tôi gọi để báo cho bạn biết rằng…
            The main reason is that… | Lý do chính là…
            I'm afraid the flight has been delayed. | Tôi e là chuyến bay đã bị hoãn.
            Actually, I've changed my mind. | Thật ra, tôi đã đổi ý.
            What I'd like you to do is… | Điều tôi muốn bạn làm là…
            ~~~
          `,
        },
      ],
    },
    {
      id: 'l2',
      title: 'Phần 2. Chi tiết từng phần và mẹo làm',
      sections: [
        {
          id: 'l2-part1-general',
          title: '2.1. Part 1 – Câu hỏi tổng quan (địa điểm, người nói, chủ đề, hoạt động)',
          body: md`
            Part 1 gồm 8 đoạn ngắn: thông báo ở sân bay/siêu thị/nhà ga, tin nhắn thoại, hướng dẫn, hội thoại 2–3 lượt lời. Mỗi đoạn **một câu hỏi**. Sách luyện (track **01–07**) chia thành 4 dạng tổng quan.

            **A. Câu hỏi về địa điểm** — _Where are the speakers? / Where does the conversation take place? / Where would you hear this announcement?_

            Địa điểm **hiếm khi được nói thẳng**. Hãy nghe các **từ liên quan** rồi suy ra. Nhưng đừng chọn chỉ vì nghe một từ — một từ có thể hợp nhiều nơi.

            ~~~vocab Từ khoá gợi ý địa điểm
            boarding pass | /ˈbɔːdɪŋ pɑːs/ | n | thẻ lên máy bay | Please have your boarding pass ready. → sân bay
            check-in counter | /ˈtʃek ɪn ˌkaʊntə/ | n | quầy làm thủ tục | → sân bay, khách sạn
            platform | /ˈplætfɔːm/ | n | sân ga | The train leaves from platform 4. → nhà ga
            prescription | /prɪˈskrɪpʃn/ | n | đơn thuốc | → hiệu thuốc, phòng khám
            reservation | /ˌrezəˈveɪʃn/ | n | sự đặt chỗ | → nhà hàng, khách sạn
            receipt | /rɪˈsiːt/ | n | hoá đơn | → cửa hàng
            checkout | /ˈtʃekaʊt/ | n | quầy thanh toán | → siêu thị
            withdraw | /wɪðˈdrɔː/ | v | rút (tiền) | I'd like to withdraw some money. → ngân hàng
            reference book | /ˈrefrəns bʊk/ | n | sách tham khảo (không mượn về) | → thư viện
            stage | /steɪdʒ/ | n | sân khấu | → nhà hát
            ~~~

            ~~~dialog Ví dụ (đáp án: B. In their living room)
            Woman: The sounds of the birds and the waves are so relaxing.
            Man: Yes, this soundtrack is very realistic. I feel as if I'm at the beach right now.
            Woman: It sure makes being home on a rainy day a little easier.
            ~~~

            Câu hỏi: _Where are the speakers?_ — A. At the beach · B. In their living room · C. On a rainy street · D. At a zoo. Nghe thấy **beach** và **rainy** nhưng đó là bẫy; cụm **soundtrack**, **being home on a rainy day** cho biết họ đang ở nhà nghe nhạc → **B**.

            **B. Câu hỏi về người nói / người nghe** — _Who is the man? / What is the woman's job? / Who is the announcement for?_

            Nghe từ vựng nghề nghiệp: _captain, seat belt sign_ → tiếp viên (flight attendant); _homework, midterm test_ → giáo viên; _prescription, symptoms_ → bác sĩ/dược sĩ; _invoice, budget_ → kế toán.

            **C. Câu hỏi về chủ đề / mục đích** — _What is the talk mainly about? / What is the purpose of the message?_ Thông tin nằm ở **1–2 câu đầu**. Mục đích tin nhắn thoại: _I'm calling to… / I'm calling about… / This is a reminder that…_

            **D. Câu hỏi về hoạt động** — _What are the speakers doing? / What will the man probably do next?_ Câu "do next" → đáp án nằm ở **câu cuối**: _I'll…, Let me…, I'm going to…, Why don't we…_

            ~~~tip Mẹo Part 1 – dạng tổng quan
            - Trước khi nghe, đọc nhanh 4 lựa chọn và tưởng tượng 4 khung cảnh khác nhau. Khi nghe, gạch dần lựa chọn không khớp.
            - Câu hỏi "Where would you hear this?" với thông báo bắt đầu bằng *Attention, shoppers / passengers / visitors* → từ đầu tiên đã cho đáp án: siêu thị/cửa hàng, sân bay/nhà ga, bảo tàng/khu vui chơi.
            ~~~
          `,
        },
        {
          id: 'l2-part1-detail',
          title: '2.2. Part 1 – Câu hỏi chi tiết (thời gian, địa điểm, lý do, yêu cầu)',
          body: md`
            Sách luyện track **08–14**. Câu hỏi chi tiết hỏi đúng một thông tin cụ thể, thường có **nhiều thông tin gây nhiễu cùng loại** (2–3 mốc giờ, 2–3 địa điểm).

            **A. Thời gian** — _When…? What time…? How long…? How often…?_ Bài nói hay nhắc nhiều mốc giờ rồi **đổi lại**: "_The meeting was at 2, but it's been moved to 3:30._" → đáp án là 3:30.

            ~~~vocab Số và thời gian dễ nghe nhầm
            thirteen | /ˌθɜːˈtiːn/ | num | 13 (nhấn âm sau) | The bus leaves at one thirteen.
            thirty | /ˈθɜːti/ | num | 30 (nhấn âm đầu) | It takes thirty minutes.
            fifteen | /ˌfɪfˈtiːn/ | num | 15 | Gate fifteen.
            fifty | /ˈfɪfti/ | num | 50 | Fifty dollars.
            quarter past | /ˈkwɔːtə pɑːst/ | phr | hơn 15 phút | quarter past seven = 7:15
            half past | /hɑːf pɑːst/ | phr | rưỡi | half past nine = 9:30
            fortnight | /ˈfɔːtnaɪt/ | n | hai tuần | in a fortnight
            postpone | /pəˈspəʊn/ | v | hoãn lại | The match has been postponed.
            ~~~

            **B. Địa điểm cụ thể** — _Where should the man go? Where did the woman leave her keys?_ Nghe giới từ chỉ vị trí: _next to, opposite, behind, on the second floor, at the end of the corridor_.

            **C. Lý do** — _Why…?_ Nghe từ nối chỉ nguyên nhân: _because, since, as, due to, because of, that's why, the reason is_.

            **D. Yêu cầu – đề nghị – hướng dẫn** — _What does the man ask the woman to do? What does the speaker suggest?_

            ~~~say Mẫu câu yêu cầu/đề nghị (nghe là biết đáp án tới)
            Could you please send me the report by Friday? | Bạn có thể gửi báo cáo cho tôi trước thứ Sáu không?
            Would you mind closing the window? | Bạn có phiền đóng cửa sổ không?
            Why don't you take the train instead? | Sao bạn không đi tàu thay vào đó?
            I suggest booking the tickets early. | Tôi đề nghị đặt vé sớm.
            Make sure you bring your ID card. | Nhớ mang theo thẻ căn cước.
            You'd better see a doctor. | Bạn nên đi khám bác sĩ.
            ~~~

            ~~~tip Mẹo Part 1 – dạng chi tiết
            - Viết nháp nhanh các con số/mốc giờ nghe được, gạch cái bị huỷ/đổi.
            - Câu hỏi "What does the man ask the woman to do?" → nghe **lượt lời của người đàn ông** có *Could you / Can you / Please*.
            - Câu hỏi "Why…?" → đáp án thường diễn đạt lại: *I've got a terrible headache* → "*He feels unwell*".
            ~~~
          `,
        },
        {
          id: 'l2-distractors',
          title: '2.3. Bẫy "từ đánh lạc hướng" (distractors)',
          body: md`
            Sách luyện track **15–19**. Người ra đề cố ý đặt vào lựa chọn sai những từ **nghe giống** từ trong bài. Bốn loại bẫy:

            | Loại bẫy                           | Ví dụ trong bài nghe               | Lựa chọn bẫy       |
            | ---------------------------------- | ---------------------------------- | ------------------ |
            | Từ có âm tương tự                  | {{walk                             | /wɔːk/             | đi bộ}}             | {{work                  | /wɜːk/ | làm việc}} |
            | Từ đồng âm khác nghĩa              | {{right                            | /raɪt/             | đúng, bên phải}}    | {{write                 | /raɪt/ | viết}}     |
            | Đồng âm cùng cách viết, khác nghĩa | {{book                             | /bʊk/              | đặt (chỗ)}} a table | a **book** (quyển sách) |
            | Từ trái nghĩa / phủ định           | _It's_ **not** _expensive at all._ | "It is expensive." |

            ~~~vocab Cặp từ dễ nhầm trong VSTEP
            sheep / ship | /ʃiːp/ – /ʃɪp/ | n | con cừu / con tàu |
            live / leave | /lɪv/ – /liːv/ | v | sống / rời đi |
            pull / pool | /pʊl/ – /puːl/ | v / n | kéo / bể bơi |
            hire / higher | /ˈhaɪə/ | v / adj | thuê / cao hơn |
            weather / whether | /ˈweðə/ | n / conj | thời tiết / liệu |
            flour / flower | /ˈflaʊə/ | n | bột mì / hoa |
            sale / sail | /seɪl/ | n / v | đợt giảm giá / chèo thuyền |
            fare / fair | /feə/ | n / adj | giá vé / công bằng, hội chợ |
            ~~~

            ~~~tip Cách thoát bẫy
            Hỏi lại: "Lựa chọn này **có cùng nghĩa** với điều người nói muốn nói không?" chứ không phải "có cùng âm không?". Nếu lựa chọn chứa đúng 1 từ y hệt bài nghe mà nghĩa cả câu khác → loại.
            ~~~
          `,
        },
        {
          id: 'l2-part2',
          title: '2.4. Part 2 – Hội thoại dài (ý chính, mục đích, chi tiết)',
          body: md`
            3 hội thoại × 4 câu. Chủ đề quen thuộc: sinh viên hỏi giảng viên về bài tập, đặt phòng khách sạn, phỏng vấn xin việc, bạn bè lên kế hoạch du lịch, khách phàn nàn với cửa hàng. Sách luyện track **20–54** (L2.1–L2.4).

            **Thứ tự câu hỏi = thứ tự thông tin trong bài.** Câu 1 thường hỏi chủ đề/mục đích (nghe ở đầu), câu 2–3 hỏi chi tiết (giữa bài), câu 4 hỏi việc sắp làm hoặc kết luận (cuối bài).

            **A. Ý chính (main idea)** — _What are the speakers mainly discussing?_ Nghe 2–3 lượt lời đầu; ý chính là điều **cả hai người cùng nói tới nhiều lần**, không phải chi tiết nhỏ.

            **B. Mục đích (purpose)** — _Why does the woman visit the office? What is the purpose of the call?_

            ~~~say Câu nêu mục đích
            I'm here to ask about the job you advertised. | Tôi đến để hỏi về công việc bạn đã đăng tuyển.
            I was wondering if I could get an extension on my essay. | Em tự hỏi liệu em có thể được gia hạn bài luận không.
            The reason I'm calling is to change my booking. | Lý do tôi gọi là để đổi đặt chỗ.
            I'd like to complain about the service. | Tôi muốn phàn nàn về dịch vụ.
            ~~~

            **C. Chi tiết (details)** — tìm **từ khoá (key words)** trong câu hỏi, nghe đoạn có từ khoá hoặc từ đồng nghĩa. Ví dụ câu hỏi: _How much does the course cost?_ → nghe con số đi cùng _fee, price, cost, pay_.

            **D. Nhận biết cách diễn đạt khác (paraphrase)** — đáp án hầu như luôn viết lại bằng từ khác:

            ~~~vocab Paraphrase thường gặp
            cheap | /tʃiːp/ | adj | rẻ | = inexpensive, doesn't cost much, affordable
            buy | /baɪ/ | v | mua | = purchase /ˈpɜːtʃəs/
            cancel | /ˈkænsl/ | v | huỷ | = call off
            delay | /dɪˈleɪ/ | v | trì hoãn | = postpone, put off
            begin | /bɪˈɡɪn/ | v | bắt đầu | = start, kick off
            help | /help/ | v | giúp | = assist /əˈsɪst/, give a hand
            tired | /ˈtaɪəd/ | adj | mệt | = exhausted /ɪɡˈzɔːstɪd/, worn out
            find out | /faɪnd aʊt/ | phr v | tìm ra | = discover
            not enough | /nɒt ɪˈnʌf/ | phr | không đủ | = a shortage of, run out of
            near | /nɪə/ | prep | gần | = close to, within walking distance
            ~~~

            ~~~tip Mẹo Part 2
            - Dùng thời gian chờ để đọc **cả 4 câu hỏi** của đoạn, không chỉ câu đầu. Biết trước 4 thông tin cần nghe thì dễ theo dõi.
            - Xác định ai nói gì: câu hỏi "*What does the* **man** *suggest?*" → chỉ nghe lượt lời của người đàn ông.
            - Nếu lỡ câu 2, vẫn tập trung câu 3 — các câu độc lập với nhau.
            ~~~
          `,
        },
        {
          id: 'l2-part3',
          title: '2.5. Part 3 – Bài nói/bài giảng (suy luận, mục đích câu nói)',
          body: md`
            3 bài × 5 câu, mỗi bài 3–5 phút: bài giảng đại học (động vật, lịch sử, môi trường, tâm lý học), bài thuyết trình, phỏng vấn trên radio. Đây là phần khó nhất; người ôn B1 **chỉ cần chắc 4–5 câu**. Sách luyện track **55–64** (phần mở rộng: suy luận, mục đích/chức năng).

            **Cấu trúc bài giảng — nghe "biển chỉ đường" (signposting):**

            ~~~vocab Từ báo hiệu cấu trúc bài nói
            Today we're going to look at… | | phr | Hôm nay chúng ta sẽ tìm hiểu… | → chủ đề (câu hỏi số 1)
            First of all | /fɜːst əv ɔːl/ | phr | Trước hết | → ý 1
            Another point is… | | phr | Một điểm khác là… | → ý 2
            On the other hand | /ɒn ði ˈʌðə hænd/ | phr | Mặt khác | → ý trái ngược
            For example | /fər ɪɡˈzɑːmpl/ | phr | Ví dụ | → chi tiết minh hoạ
            As a result | /əz ə rɪˈzʌlt/ | phr | Kết quả là | → hệ quả
            The most important thing is… | | phr | Điều quan trọng nhất là… | → thường được hỏi
            To sum up | /tə sʌm ʌp/ | phr | Tóm lại | → kết luận
            ~~~

            **A. Câu hỏi suy luận** — _What can be inferred about…? What does the speaker imply?_ Đáp án **không nói thẳng** nhưng suy ra được. Ví dụ: "_Tickets sold out within an hour._" → suy ra "_The event was very popular._"

            **B. Câu hỏi mục đích/chức năng của một câu nói** — _Why does the speaker say "…"?_ Nghe lại ngữ cảnh: người nói đang đưa ví dụ, đổi chủ đề, nhấn mạnh, hay đùa?

            **C. Thái độ người nói** — _What is the speaker's attitude towards…?_ Nghe tính từ: _impressive, worrying, surprisingly, unfortunately_.

            ~~~tip Chiến thuật Part 3 cho B1
            1. Câu đầu tiên của mỗi bài gần như luôn hỏi **chủ đề** → nghe kỹ 30 giây đầu, ăn chắc 3 câu này.
            2. Các câu còn lại xếp theo trình tự bài nói; nghe từ khoá trong câu hỏi (tên riêng, năm, con số) để biết đang tới câu nào.
            3. Không hiểu hết cũng được: chọn lựa chọn **chung chung, ôn hoà**; tránh lựa chọn có *always, never, all, only* nếu bài không nói vậy.
            4. Hết bài là chuyển ngay, đọc 5 câu của bài sau.
            ~~~
          `,
        },
        {
          id: 'l2-practice',
          title: '2.6. Luyện với 64 track của sách',
          body: md`
            Tài liệu "Ôn tổng hợp VSTEP bậc 3 (B1)" đi kèm 89 tệp MP3: track **01–64** cho môn Nghe, **65–89** cho môn Nói (phát âm và bài nói mẫu). Trong mục **Luyện tập** của kỹ năng Nghe, mỗi track hiện kèm trang sách và trang lời thoại/đáp án.

            | Track | Bài trong sách | Nội dung                         |
            | ----- | -------------- | -------------------------------- |
            | 01–07 | L1.1           | Part 1 – câu hỏi tổng quan       |
            | 08–14 | L1.2           | Part 1 – câu hỏi chi tiết        |
            | 15–19 | L1.3           | Từ đánh lạc hướng                |
            | 20–30 | L2.1           | Part 2&3 – nhận biết ý chính     |
            | 31–39 | L2.2           | Nhận biết mục đích chính         |
            | 40–47 | L2.3           | Nhận biết chi tiết               |
            | 48–54 | L2.4           | Nhận biết cách diễn đạt khác     |
            | 55–60 | L3.1           | Câu hỏi suy luận                 |
            | 61–64 | L3.2           | Mục đích/chức năng của diễn ngôn |

            **Quy trình luyện một track (20–30 phút):**

            1. Đọc câu hỏi trong trang sách, gạch từ khoá (2 phút).
            2. Nghe **1 lần** như thi thật, chọn đáp án.
            3. Xem đáp án, ghi số câu đúng vào ô tự chấm.
            4. Nghe lại lần 2–3 **vừa nghe vừa nhìn lời thoại** (bấm "Lời thoại"), tìm chỗ chứa đáp án.
            5. Chép lại 5 từ/cụm mới vào sổ, đọc to theo băng (shadowing) 2 lần ở tốc độ 0,8×.
          `,
        },
      ],
    },
    {
      id: 'l3',
      title: 'Phần 3. Xu hướng ra đề, đoán đề và bí quyết',
      sections: [
        {
          id: 'l3-trends',
          title: '3.1. Xu hướng đề gần đây',
          body: md`
            Tổng hợp từ các đề chia sẻ công khai của các trung tâm luyện thi trong năm 2025–2026 (không phải thông báo chính thức của Bộ GD&ĐT; cấu trúc đề vẫn giữ nguyên 3 phần – 35 câu):

            - **Thi trên máy tính** là chủ yếu: mỗi đoạn tự động chạy, không tua lại được. Hãy luyện thói quen nghe 1 lần.
            - **Ít câu "nghe thấy là chọn"**, nhiều câu **paraphrase**: đáp án dùng từ đồng nghĩa với bài nói.
            - Part 1 thiên về **đời sống thực tế**: thông báo sân bay, siêu thị, tin nhắn thoại hẹn lịch, hướng dẫn đường đi.
            - Part 2 thường là **bối cảnh đại học và công sở**: sinh viên – giảng viên, đăng ký khoá học, nhân viên – quản lý, phỏng vấn.
            - Part 3 hay rơi vào **khoa học phổ thông**: động vật, môi trường, sức khoẻ, lịch sử một phát minh, tâm lý học học tập.
            - Câu hỏi về **mục đích của một câu nói** và **thái độ người nói** xuất hiện đều đặn ở Part 3.
          `,
        },
        {
          id: 'l3-predict',
          title: '3.2. Đoán đề: chủ đề nên chuẩn bị từ vựng',
          body: md`
            ~~~vocab Du lịch – giao thông
            itinerary | /aɪˈtɪnərəri/ | n | lịch trình | The itinerary includes three cities.
            departure | /dɪˈpɑːtʃə/ | n | sự khởi hành | Departure time is 9 a.m.
            delay | /dɪˈleɪ/ | n, v | sự chậm trễ | Flight VN123 is delayed.
            luggage | /ˈlʌɡɪdʒ/ | n | hành lý | Don't leave your luggage unattended.
            accommodation | /əˌkɒməˈdeɪʃn/ | n | chỗ ở | The price includes accommodation.
            ~~~

            ~~~vocab Học đường
            assignment | /əˈsaɪnmənt/ | n | bài tập lớn | The assignment is due on Monday.
            deadline | /ˈdedlaɪn/ | n | hạn chót | Can I extend the deadline?
            lecture | /ˈlektʃə/ | n | bài giảng | The lecture starts at eight.
            enrol | /ɪnˈrəʊl/ | v | đăng ký học | I want to enrol in the course.
            scholarship | /ˈskɒləʃɪp/ | n | học bổng | She won a scholarship.
            ~~~

            ~~~vocab Công việc
            interview | /ˈɪntəvjuː/ | n | buổi phỏng vấn | I have a job interview tomorrow.
            applicant | /ˈæplɪkənt/ | n | người ứng tuyển | There are fifty applicants.
            colleague | /ˈkɒliːɡ/ | n | đồng nghiệp | My colleagues are friendly.
            salary | /ˈsæləri/ | n | lương | The salary is quite high.
            promotion | /prəˈməʊʃn/ | n | sự thăng chức | He got a promotion last year.
            ~~~

            ~~~vocab Sức khoẻ – môi trường
            symptom | /ˈsɪmptəm/ | n | triệu chứng | What are your symptoms?
            appointment | /əˈpɔɪntmənt/ | n | cuộc hẹn | I'd like to make an appointment.
            pollution | /pəˈluːʃn/ | n | sự ô nhiễm | Air pollution is a serious problem.
            recycle | /ˌriːˈsaɪkl/ | v | tái chế | We should recycle plastic bottles.
            species | /ˈspiːʃiːz/ | n | loài | Many species are in danger.
            ~~~
          `,
        },
        {
          id: 'l3-secrets',
          title: '3.3. Bí quyết phòng thi',
          body: md`
            ~~~tip 10 điều cần nhớ trong phòng thi Nghe
            1. Đeo tai nghe, chỉnh âm lượng ở phần nghe thử — đừng ngại giơ tay báo nếu tai nghe rè.
            2. Trong lúc nghe hướng dẫn chung của mỗi phần (bạn đã biết rồi), **đọc trước câu hỏi**.
            3. Part 1: đọc câu hỏi + 4 lựa chọn, đoán bối cảnh trong 5 giây.
            4. Part 2: đọc lướt cả 4 câu hỏi của đoạn trước khi đoạn chạy.
            5. Đáp án đúng thường là **cách nói khác**; lựa chọn lặp y nguyên từ trong bài thường là bẫy.
            6. Nghe từ đổi ý *but, actually, unfortunately* — đáp án ở sau.
            7. Câu "do next/will probably do" → nghe câu cuối.
            8. Part 3: ăn chắc câu hỏi chủ đề đầu mỗi bài.
            9. Không để trống câu nào; câu không nghe được chọn cùng một chữ cái.
            10. Xong phần Nghe là xong — không nghĩ lại khi đang làm Đọc.
            ~~~

            **Tuần cuối trước thi:** mỗi ngày nghe 1 đề hoàn chỉnh (hoặc 3 track của sách) đúng tốc độ, rồi nghe lại có lời thoại. Trước khi ngủ nghe thụ động 15 phút bài giảng tiếng Anh ngắn để quen tốc độ.
          `,
        },
      ],
    },
  ],
};
