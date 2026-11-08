import { md, type VDoc } from './types';

export const readingDoc: VDoc = {
  id: 'reading',
  title: 'Kỹ năng Đọc (Reading)',
  subtitle: '4 bài đọc, 40 câu, 60 phút',
  parts: [
    {
      id: 'r1',
      title: 'Phần 1. Tổng quan bài thi Đọc',
      sections: [
        {
          id: 'r1-structure',
          title: '1.1. Cấu trúc đề',
          body: md`
            Bài thi Đọc gồm **4 bài đọc**, mỗi bài **10 câu hỏi trắc nghiệm 4 lựa chọn**, tổng **40 câu trong 60 phút**. Độ dài mỗi bài khoảng 400–500 từ, **độ khó tăng dần** từ bài 1 (bậc 3) tới bài 4 (bậc 5).

            | Bài       | Độ khó     | Dạng văn bản hay gặp               | Thời gian nên dành |
            | --------- | ---------- | ---------------------------------- | ------------------ |
            | Passage 1 | Bậc 3 (B1) | Thông báo, email, bài báo đời sống | 12 phút            |
            | Passage 2 | Bậc 3–4    | Bài báo, hướng dẫn, quảng cáo dài  | 14 phút            |
            | Passage 3 | Bậc 4 (B2) | Bài báo khoa học phổ thông         | 16 phút            |
            | Passage 4 | Bậc 5 (C1) | Bài học thuật, nghiên cứu          | 15 phút            |

            Còn khoảng 3 phút để kiểm tra và tô/chọn hết các câu chưa làm. **Không trừ điểm câu sai.**

            Câu hỏi đi **theo thứ tự đoạn văn** (trừ câu hỏi ý chính và câu hỏi từ vựng có ghi số dòng/đoạn).
          `,
        },
        {
          id: 'r1-score',
          title: '1.2. Điểm số và mục tiêu cho B1',
          body: md`
            | Số câu đúng / 40 | Điểm ước tính | Nhận xét         |
            | ---------------- | ------------- | ---------------- |
            | 14               | 3,5           | Chưa đủ          |
            | **16**           | **4,0**       | Ngưỡng tối thiểu |
            | **18**           | **4,5**       | Mục tiêu an toàn |
            | 20               | 5,0           | Tốt              |
            | 24               | 6,0           | Mức B2           |

            ~~~tip Kế hoạch lấy 18/40 câu
            - Passage 1: đúng **7/10** - bài dễ nhất, đầu tư thời gian ở đây.
            - Passage 2: đúng **5/10**.
            - Passage 3: đúng **3–4/10** (chọn làm câu từ vựng, câu chi tiết có tên riêng/số).
            - Passage 4: làm nhanh câu từ vựng, câu tham chiếu (*it, they*); còn lại đoán.
            ~~~
          `,
        },
        {
          id: 'r1-tips',
          title: '1.3. Mẹo chung: skimming và scanning',
          body: md`
            - **Skimming (đọc lướt)** - đọc tiêu đề, câu đầu mỗi đoạn và câu cuối bài để nắm ý chính. Dùng cho câu hỏi ý chính, mục đích.
            - **Scanning (đọc quét)** - tìm nhanh một từ khoá: tên riêng, năm, con số, chữ in hoa. Dùng cho câu hỏi chi tiết.
            - **Đọc câu hỏi trước, đọc bài sau**: gạch từ khoá trong câu hỏi, quét bài tìm đoạn chứa từ khoá (hoặc từ đồng nghĩa), đọc kỹ 2–3 câu xung quanh.
            - **Không cần hiểu hết bài.** Chỉ cần hiểu những câu chứa đáp án.
            - **Không dịch từng chữ**; gặp từ lạ thì đoán nghĩa theo ngữ cảnh rồi đọc tiếp.
            - Câu nào quá 2 phút chưa ra → chọn tạm, đánh dấu, quay lại sau.

            ~~~say Từ chỉ dẫn quan trọng trong bài đọc
            However, the results were disappointing. | Tuy nhiên, kết quả lại đáng thất vọng. (ý trái ngược)
            In other words, the plan failed. | Nói cách khác, kế hoạch đã thất bại. (giải thích lại)
            As a result, prices went up. | Kết quả là giá tăng lên. (hệ quả)
            For instance, many students work part-time. | Ví dụ, nhiều sinh viên làm thêm. (ví dụ)
            Unlike cats, dogs need daily walks. | Không giống mèo, chó cần đi dạo hằng ngày. (so sánh)
            ~~~
          `,
        },
      ],
    },
    {
      id: 'r2',
      title: 'Phần 2. Các dạng câu hỏi và cách làm',
      sections: [
        {
          id: 'r2-vocab',
          title: '2.1. Câu hỏi từ vựng',
          body: md`
            _The word "**X**" in paragraph 2 is closest in meaning to… / The word "X" could best be replaced by…_

            **Cách làm:**

            1. Tìm từ trong bài, đọc **cả câu chứa nó** và câu trước/sau.
            2. Xác định từ loại (danh từ, động từ, tính từ) và sắc thái (tích cực/tiêu cực).
            3. **Thay từng lựa chọn vào chỗ của từ đó** - lựa chọn nào giữ nguyên nghĩa câu là đáp án.
            4. Cẩn thận lựa chọn là nghĩa phổ biến của từ nhưng **không hợp ngữ cảnh**.

            Ví dụ: _The company_ **launched** _a new product last month._ - A. threw · B. **introduced** · C. ate · D. started a boat. Nghĩa phổ biến của _launch_ là "phóng (tên lửa)" nhưng trong ngữ cảnh sản phẩm → **introduced** (giới thiệu, tung ra).

            ~~~vocab Từ hay được hỏi nghĩa
            significant | /sɪɡˈnɪfɪkənt/ | adj | đáng kể, quan trọng | = important, considerable
            decline | /dɪˈklaɪn/ | v, n | giảm | = decrease, fall, drop
            obtain | /əbˈteɪn/ | v | đạt được | = get, gain, acquire
            vital | /ˈvaɪtl/ | adj | thiết yếu | = essential, crucial
            enormous | /ɪˈnɔːməs/ | adj | khổng lồ | = huge, massive
            reluctant | /rɪˈlʌktənt/ | adj | miễn cưỡng | = unwilling
            approximately | /əˈprɒksɪmətli/ | adv | khoảng chừng | = about, roughly
            consequence | /ˈkɒnsɪkwəns/ | n | hậu quả | = result, effect
            ~~~
          `,
        },
        {
          id: 'r2-main',
          title: '2.2. Câu hỏi ý chính / tiêu đề',
          body: md`
            _What is the passage mainly about? / What is the main idea of paragraph 3? / Which is the best title for the passage?_

            **Cách làm:** để câu này **làm sau cùng** của mỗi bài (khi đã đọc hết các đoạn để làm câu khác). Đọc câu đầu mỗi đoạn + đoạn kết.

            Loại các lựa chọn:

            - **Quá hẹp**: chỉ nói về 1 chi tiết/1 đoạn.
            - **Quá rộng**: chung chung hơn nội dung bài (ví dụ bài về "chó dẫn đường" nhưng lựa chọn là "Động vật").
            - **Sai thông tin** hoặc **không được nhắc tới**.

            ~~~tip
            Ý chính thường nằm ở **câu chủ đề (topic sentence)** - câu đầu tiên của đoạn - và được nhắc lại trong đoạn kết bằng từ khác.
            ~~~
          `,
        },
        {
          id: 'r2-detail',
          title: '2.3. Câu hỏi chi tiết',
          body: md`
            _According to the passage, what/when/why…? / Which of the following is true about X?_

            **Cách làm:**

            1. Gạch từ khoá trong câu hỏi - ưu tiên tên riêng, năm, số, thuật ngữ.
            2. Scan bài tìm từ khoá hoặc **từ đồng nghĩa**.
            3. Đọc kỹ câu chứa từ khoá; so sánh **từng lựa chọn** với câu đó.
            4. Đáp án đúng **diễn đạt lại** thông tin trong bài; lựa chọn chép y nguyên từ ngữ nhưng đổi nghĩa thường là bẫy.

            ~~~dialog Ví dụ
            Bài đọc: Although the museum is free on Sundays, visitors must book tickets online in advance.
            Câu hỏi: What is true about Sunday visits?
            A. Visitors pay at the door.
            B. Tickets must be reserved beforehand.  ← đúng (book in advance = reserved beforehand)
            C. The museum is closed.
            D. Online booking is not available.
            ~~~
          `,
        },
        {
          id: 'r2-negative',
          title: '2.4. Câu hỏi phủ định (NOT / EXCEPT)',
          body: md`
            _Which of the following is NOT mentioned…? / All of the following are true EXCEPT…_

            **Cách làm:** đây là câu tốn thời gian nhất. Tìm đoạn liệt kê (thường có _and, also, in addition, such as_), **đánh dấu lần lượt 3 lựa chọn có trong bài**, lựa chọn còn lại là đáp án.

            ~~~warn
            Đọc kỹ chữ **NOT/EXCEPT** in hoa - nhiều bạn quên và chọn lựa chọn đúng. Nếu thiếu thời gian, làm câu này cuối cùng.
            ~~~
          `,
        },
        {
          id: 'r2-reference',
          title: '2.5. Câu hỏi tham chiếu (it, they, this…)',
          body: md`
            _The word "**they**" in paragraph 2 refers to…_

            **Cách làm:** từ thay thế luôn chỉ một danh từ **đứng trước** nó (thường trong câu đó hoặc câu ngay trước). Thay từng lựa chọn vào vị trí của từ:

            - _they/them/their_ → danh từ **số nhiều**
            - _it/its_ → danh từ số ít hoặc cả một ý
            - _this/that_ → thường chỉ cả một ý/sự việc vừa nhắc

            Ví dụ: _Scientists studied 200_ **dolphins***. They found that* **they** _can recognise their own names._ - "they" thứ hai = **dolphins**, không phải scientists.
          `,
        },
        {
          id: 'r2-inference',
          title: '2.6. Câu hỏi suy luận và mục đích tác giả',
          body: md`
            **Suy luận** - _It can be inferred from the passage that… / The author implies that…_ Đáp án không viết thẳng nhưng **chắc chắn đúng** dựa trên bài. Không suy diễn quá xa: chọn lựa chọn **gần với bài nhất**.

            **Mục đích** - _Why does the author mention X? / The purpose of paragraph 4 is to…_

            ~~~vocab Động từ chỉ mục đích tác giả
            illustrate | /ˈɪləstreɪt/ | v | minh hoạ | to illustrate a point = đưa ví dụ
            compare | /kəmˈpeə/ | v | so sánh | to compare two methods
            criticise | /ˈkrɪtɪsaɪz/ | v | phê phán | to criticise a decision
            explain | /ɪkˈspleɪn/ | v | giải thích | to explain a process
            suggest | /səˈdʒest/ | v | đề xuất | to suggest a solution
            describe | /dɪˈskraɪb/ | v | mô tả | to describe a place
            ~~~

            **Thái độ/giọng văn** - _The author's attitude towards X is…_: positive/supportive, negative/critical, neutral/objective, doubtful/sceptical.
          `,
        },
        {
          id: 'r2-paraphrase',
          title: '2.7. Câu hỏi nhận biết thông tin diễn đạt lại và chèn câu',
          body: md`
            **Diễn đạt lại** - _Which sentence best expresses the essential information in the highlighted sentence?_ Chọn câu giữ **đủ ý chính và đúng quan hệ** (nguyên nhân – kết quả, đối lập). Loại câu đổi nghĩa hoặc thiếu ý quan trọng.

            **Chèn câu (insertion)** - _Where would the following sentence best fit? [A] [B] [C] [D]_ Tìm "manh mối nối":

            - Câu cần chèn có _this, these, such, however, also, for example_ → phải đứng **sau** câu mà nó nhắc tới.
            - Câu chèn mở đầu ý mới → thường đứng đầu đoạn.

            Bài luyện trong sách: R – phần mở rộng (câu hỏi mục đích tr.174, câu hỏi chèn câu tr.185).
          `,
        },
      ],
    },
    {
      id: 'r3',
      title: 'Phần 3. Xu hướng, đoán đề và bí quyết',
      sections: [
        {
          id: 'r3-trends',
          title: '3.1. Xu hướng gần đây',
          body: md`
            - Chủ đề bài đọc: **công nghệ – mạng xã hội**, **môi trường – biến đổi khí hậu**, **sức khoẻ – giấc ngủ – dinh dưỡng**, **giáo dục – học trực tuyến**, **văn hoá – du lịch**, **động vật**, **lịch sử một phát minh**.
            - Bài 1 thường là **email/thông báo/quảng cáo** thực tế → câu hỏi chi tiết dễ.
            - Câu hỏi **từ vựng** chiếm khoảng 8–10/40 câu → học từ đồng nghĩa phổ biến là cách lấy điểm nhanh nhất.
            - Câu hỏi **NOT/EXCEPT**, **tham chiếu** gần như đề nào cũng có.
            - Bài 3–4 nhiều từ học thuật (danh từ trừu tượng: _phenomenon, evidence, impact, strategy_).
          `,
        },
        {
          id: 'r3-vocab',
          title: '3.2. Từ học thuật nên thuộc',
          body: md`
            ~~~vocab 20 từ học thuật hay gặp trong bài 3–4
            evidence | /ˈevɪdəns/ | n | bằng chứng | There is no evidence that…
            impact | /ˈɪmpækt/ | n | tác động | the impact of social media
            research | /rɪˈsɜːtʃ/ | n | nghiên cứu | Recent research shows that…
            factor | /ˈfæktə/ | n | yếu tố | an important factor
            benefit | /ˈbenɪfɪt/ | n | lợi ích | the benefits of exercise
            issue | /ˈɪʃuː/ | n | vấn đề | a serious issue
            method | /ˈmeθəd/ | n | phương pháp | a new teaching method
            increase | /ɪnˈkriːs/ | v | tăng | Prices increased by 10%.
            reduce | /rɪˈdjuːs/ | v | giảm | to reduce stress
            require | /rɪˈkwaɪə/ | v | yêu cầu | The job requires experience.
            indicate | /ˈɪndɪkeɪt/ | v | cho thấy | Studies indicate that…
            claim | /kleɪm/ | v | khẳng định | Some experts claim that…
            available | /əˈveɪləbl/ | adj | có sẵn | Tickets are available online.
            essential | /ɪˈsenʃl/ | adj | thiết yếu | Water is essential for life.
            efficient | /ɪˈfɪʃnt/ | adj | hiệu quả | an efficient system
            environment | /ɪnˈvaɪrənmənt/ | n | môi trường | protect the environment
            population | /ˌpɒpjuˈleɪʃn/ | n | dân số | the world's population
            survey | /ˈsɜːveɪ/ | n | khảo sát | According to a survey…
            decade | /ˈdekeɪd/ | n | thập kỷ | over the past decade
            ancient | /ˈeɪnʃənt/ | adj | cổ xưa | ancient civilisations
            ~~~
          `,
        },
        {
          id: 'r3-secrets',
          title: '3.3. Bí quyết phòng thi Đọc',
          body: md`
            ~~~tip
            1. **Làm theo thứ tự bài 1 → 4**; bài 1–2 đáng điểm nhất cho B1.
            2. Đặt mốc giờ: hết phút 12 xong bài 1, phút 26 xong bài 2, phút 42 xong bài 3, phút 57 xong bài 4.
            3. Mỗi bài: làm câu **từ vựng và tham chiếu trước** (chỉ cần đọc 1–2 câu), rồi câu chi tiết, cuối cùng ý chính và NOT.
            4. Đáp án đúng thường dùng **từ đồng nghĩa**; lựa chọn chép nguyên văn là bẫy.
            5. Hết giờ còn câu trống → chọn hết, không để trống.
            ~~~
          `,
        },
      ],
    },
  ],
};
