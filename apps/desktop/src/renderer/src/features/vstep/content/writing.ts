import { md, type VDoc } from './types';
import { WRITING_T1_EXTRA } from './writing-task1-extra';

export const writingDoc: VDoc = {
  id: 'writing',
  title: 'Kỹ năng Viết (Writing)',
  subtitle: '2 bài, 60 phút: thư/email 120 từ + bài luận 250 từ',
  parts: [
    {
      id: 'w1',
      title: 'Phần 1. Tổng quan bài thi Viết',
      sections: [
        {
          id: 'w1-structure',
          title: '1.1. Cấu trúc đề và cách chấm',
          body: md`
            |                    | Task 1                                             | Task 2            |
            | ------------------ | -------------------------------------------------- | ----------------- |
            | Dạng bài           | Thư/email (thân mật, bán trang trọng, trang trọng) | Bài luận (essay)  |
            | Số từ tối thiểu    | **120 từ**                                         | **250 từ**        |
            | Thời gian nên dành | **20 phút**                                        | **40 phút**       |
            | Trọng số           | **1/3** điểm Viết                                  | **2/3** điểm Viết |

            Điểm Viết = (Task 1 + Task 2 × 2) / 3. Ví dụ Task 1 được 5, Task 2 được 4,5 → (5 + 9) / 3 ≈ 4,67 → làm tròn 4,5.

            **4 tiêu chí chấm** (mỗi bài):

            1. **Hoàn thành yêu cầu (Task fulfilment)** - trả lời **đủ mọi ý** đề hỏi, đúng giọng văn, đủ số từ.
            2. **Tổ chức bài (Organisation)** - bố cục rõ, có đoạn, có từ nối.
            3. **Từ vựng (Vocabulary)** - đủ dùng, đúng nghĩa, có vài từ "ăn điểm".
            4. **Ngữ pháp (Grammar)** - câu đơn đúng + một số câu phức (câu điều kiện, mệnh đề quan hệ, bị động).

            ~~~warn Lỗi mất điểm nặng nhất
            - **Thiếu ý đề yêu cầu** (đề hỏi 3 ý mà chỉ viết 2) → tiêu chí 1 tụt mạnh.
            - **Thiếu số từ** (dưới 120/250) → bị trừ điểm.
            - **Lạc đề** hoặc chép lại đề quá nhiều.
            ~~~
          `,
        },
        {
          id: 'w1-target',
          title: '1.2. Mục tiêu cho người mất gốc: 5,0 điểm Viết nhờ template',
          body: md`
            Với template, người mất gốc hoàn toàn có thể đạt **5,0–5,5** vì:

            - Bố cục và từ nối có sẵn → tiêu chí **Tổ chức** gần như chắc điểm.
            - Câu mẫu đúng ngữ pháp, có câu phức → tiêu chí **Ngữ pháp** ổn định.
            - Chỉ cần thêm **ý tưởng đơn giản** vào chỗ trống → đủ yêu cầu và số từ.

            ~~~tip Chiến lược 60 phút
            1. **Làm Task 2 trước hay sau?** Người mất gốc nên làm **Task 1 trước (20 phút)** để chắc điểm, rồi dồn 40 phút cho Task 2. Tuyệt đối không quá 25 phút cho Task 1.
            2. Mỗi bài: 3 phút gạch ý đề → 2 phút dàn ý → viết theo template → 3 phút soát lỗi (s/es, thì, chính tả).
            3. Đếm từ nhanh: dòng viết tay trung bình 10–12 từ (trên máy có bộ đếm từ).
            ~~~
          `,
        },
      ],
    },
    {
      id: 'w2',
      title: 'Phần 2. Task 1 – Thư/email: template vạn năng',
      sections: [
        ...WRITING_T1_EXTRA,
        {
          id: 'w2-universal',
          title: '2.3. Khung 5 phần dùng cho mọi loại thư',
          body: md`
            Đề Task 1 luôn có dạng: _"You received an email from… Write a reply/letter to… In your letter, you should: (1)… (2)… (3)…"_. Cả thư thân mật lẫn trang trọng **dùng chung một khung 5 phần**; chỉ đổi lời chào, câu mở và câu kết theo giọng văn.

            ~~~template Khung 5 phần dùng cho mọi đề Task 1
            [1. Lời chào]  Dear [tên],

            [2. Mở thư – lý do viết]
            [Câu hỏi thăm (thư thân mật)] I am writing to [mục đích: reply to your email / ask about… / complain about…].

            [3. Thân thư – trả lời lần lượt 3 ý của đề, mỗi ý 2–3 câu]
            Firstly, [ý 1]. [Giải thích/ví dụ].
            Secondly, [ý 2]. [Giải thích/ví dụ].
            Finally, [ý 3]. [Giải thích/ví dụ].

            [4. Kết thư]  I hope [mong muốn]. I look forward to hearing from you.

            [5. Ký tên]  [Best wishes / Yours sincerely / Yours faithfully],
            [Tên]
            ~~~

            Bảng đổi giọng văn - **chỉ cần thay 4 chỗ này**:

            | Chỗ thay | Thân mật (bạn bè, người thân)               | Trang trọng (công ty, giáo sư, người lạ)                            |
            | -------- | ------------------------------------------- | ------------------------------------------------------------------- |
            | Lời chào | Dear Tom, / Hi Anna,                        | Dear Mr Brown, / Dear Sir or Madam,                                 |
            | Câu mở   | How are you? It was great to hear from you. | I am writing to…                                                    |
            | Câu kết  | Write back soon! / Can't wait to see you.   | I look forward to hearing from you.                                 |
            | Ký tên   | Best wishes, / Love, / Cheers,              | Yours sincerely, (biết tên) / Yours faithfully, (Dear Sir or Madam) |

            ~~~warn Quy tắc viết thư trang trọng
            Không viết tắt (*I'm → I am, don't → do not*), không dùng tiếng lóng, không dấu chấm than. Biết tên người nhận → **Yours sincerely**; không biết tên (Dear Sir or Madam) → **Yours faithfully**.
            ~~~
          `,
        },
        {
          id: 'w2-informal',
          title: '2.4. Thư thân mật (informal): bài mẫu',
          body: md`
            Hay gặp: trả lời bạn hỏi thăm, rủ đi chơi/cắm trại, xin lời khuyên, kể về một trải nghiệm, giới thiệu món ăn/lễ hội, cảm ơn.

            ~~~template Template thư thân mật
            Dear [tên],

            Thanks for your email. It was great to hear from you. I'm sorry for not writing back sooner, but I've been really busy with [my exams / my new job].

            You asked me about [chủ đề đề bài], so let me tell you about it.

            Firstly, [ý 1 của đề]. [Thêm 1 câu giải thích: It is… because…].
            Secondly, [ý 2 của đề]. [Ví dụ: For example, …].
            Finally, [ý 3 của đề]. [Gợi ý/đề nghị: Why don't you…? / If I were you, I would…].

            I hope this helps. Write back soon and tell me [điều muốn biết thêm].

            Best wishes,
            [Tên]
            ~~~

            ~~~sample Bài mẫu – Rủ bạn đi cắm trại cuối tuần (~140 từ)
            **Đề:** Write an email to invite your friend Alex on a weekend camping trip. In your email: say where you will go, describe the activities, and tell Alex what to bring.

            Dear Alex,

            How are you? I hope everything is going well with your studies. I am writing to invite you on a camping trip with me this weekend.

            Firstly, we are going to Ba Vi National Park, which is about 60 kilometres from Ha Noi. It is a beautiful place with fresh air and lots of trees.

            Secondly, there will be many interesting activities. We can go hiking in the morning, have a barbecue in the evening and sing songs around the campfire. If the weather is good, we can also watch the stars at night.

            Finally, please bring a warm jacket, a torch and some snacks. I will prepare the tent and the food, so you do not need to worry about that.

            I really hope you can come. Let me know by Thursday!

            Best wishes,
            Nam
            ---
            Alex thân mến,
            Bạn khoẻ không? Mình mong mọi việc học hành của bạn đều tốt. Mình viết thư để rủ bạn đi cắm trại với mình cuối tuần này.
            Thứ nhất, chúng ta sẽ đến Vườn quốc gia Ba Vì, cách Hà Nội khoảng 60 km. Đó là một nơi đẹp với không khí trong lành và nhiều cây xanh.
            Thứ hai, sẽ có nhiều hoạt động thú vị. Buổi sáng mình có thể đi bộ đường dài, buổi tối ăn đồ nướng và hát quanh lửa trại. Nếu trời đẹp, buổi tối còn có thể ngắm sao.
            Cuối cùng, bạn nhớ mang áo khoác ấm, đèn pin và ít đồ ăn vặt. Mình sẽ chuẩn bị lều và đồ ăn nên bạn không cần lo.
            Mình rất mong bạn đi được. Báo mình trước thứ Năm nhé!
            Thân, Nam
            ~~~

            ~~~say Câu "ăn điểm" cho thư thân mật
            It was lovely to hear from you. | Thật vui khi nhận được thư bạn.
            I'm sorry I haven't written for so long. | Xin lỗi mình lâu rồi không viết thư.
            Guess what? I've just got a new job! | Đoán xem? Mình vừa có việc mới!
            If I were you, I would talk to your parents first. | Nếu mình là bạn, mình sẽ nói chuyện với bố mẹ trước.
            Why don't we meet up next weekend? | Sao chúng ta không gặp nhau cuối tuần tới?
            Give my love to your family. | Gửi lời thăm gia đình bạn nhé.
            ~~~
          `,
        },
        {
          id: 'w2-formal',
          title: '2.5. Thư trang trọng (formal): xin việc, phàn nàn, hỏi thông tin',
          body: md`
            ~~~template Template thư trang trọng
            Dear [Mr/Ms + họ / Sir or Madam],

            I am writing to [apply for the position of… / complain about… / ask for information about… / request…], which I [saw advertised on… / experienced on…].

            Firstly, [ý 1 của đề]. [Chi tiết: ngày, nơi, con số].
            Secondly, [ý 2 của đề]. [Chi tiết].
            Finally, [ý 3 của đề]. [Yêu cầu cụ thể: I would be grateful if you could…].

            Thank you for your time and consideration. I look forward to hearing from you.

            Yours sincerely, / Yours faithfully,
            [Họ tên]
            ~~~

            ~~~vocab Câu mở theo mục đích
            I am writing to apply for… | | phr | Tôi viết thư để ứng tuyển… | I am writing to apply for the position of receptionist.
            I am writing to complain about… | | phr | Tôi viết thư để phàn nàn về… | I am writing to complain about the tour I took last week.
            I am writing to enquire about… | /ɪnˈkwaɪər/ | phr | Tôi viết thư để hỏi về… | I am writing to enquire about your English courses.
            I am writing to request… | /rɪˈkwest/ | phr | Tôi viết thư để đề nghị… | I am writing to request a letter of recommendation.
            I would be grateful if you could… | /ˈɡreɪtfl/ | phr | Tôi rất biết ơn nếu ông/bà có thể… | I would be grateful if you could reply soon.
            Please find attached… | /əˈtætʃt/ | phr | Xin gửi kèm… | Please find attached my CV.
            compensation | /ˌkɒmpenˈseɪʃn/ | n | tiền bồi thường | I expect full compensation.
            refund | /ˈriːfʌnd/ | n | tiền hoàn lại | I would like a full refund.
            ~~~

            ~~~sample Bài mẫu – Thư phàn nàn với công ty du lịch (~150 từ)
            **Đề:** You recently went on a package tour that had several problems. Write a letter to the manager of the travel agency. In your letter: give details of the tour, describe the problems, and say what you want the agency to do.

            Dear Sir or Madam,

            I am writing to complain about the three-day tour to Da Nang that I booked with your company from 10th to 12th October.

            Firstly, the tour was advertised as including a four-star hotel near the beach. However, the hotel we stayed in was old, dirty and about five kilometres from the sea.

            Secondly, the tour guide was often late and did not seem to know much about the places we visited. As a result, we missed the visit to the Marble Mountains, which was one of the main reasons I chose this tour.

            Finally, I would be grateful if you could give me a refund of at least 50% of the price. I believe this is fair compensation for the problems I experienced.

            I look forward to hearing from you.

            Yours faithfully,
            Nguyen Van Nam
            ---
            Kính gửi Quý ông/bà,
            Tôi viết thư này để phàn nàn về tour 3 ngày đi Đà Nẵng mà tôi đặt với công ty từ ngày 10 đến 12/10.
            Thứ nhất, tour được quảng cáo gồm khách sạn bốn sao gần biển. Tuy nhiên khách sạn chúng tôi ở cũ, bẩn và cách biển khoảng 5 km.
            Thứ hai, hướng dẫn viên thường đến muộn và có vẻ không biết nhiều về các điểm tham quan. Kết quả là chúng tôi lỡ chuyến thăm Ngũ Hành Sơn - một trong những lý do chính tôi chọn tour này.
            Cuối cùng, tôi rất mong công ty hoàn lại cho tôi ít nhất 50% giá tour. Tôi tin đây là khoản bồi thường hợp lý.
            Tôi mong nhận được phản hồi. Trân trọng, Nguyễn Văn Nam
            ~~~
          `,
        },
        {
          id: 'w2-semi',
          title: '2.6. Thư bán trang trọng và bộ câu theo chức năng',
          body: md`
            Gửi **người biết nhưng không thân**: chủ nhà, thầy cô, hàng xóm, đồng nghiệp lớn tuổi. Dùng _Dear Mr Peterson_, câu lịch sự nhưng được phép viết tắt nhẹ; kết thư **Best regards / Kind regards**.

            ~~~say Bộ câu theo chức năng (dùng cho mọi loại thư)
            I would like to thank you for your help. | Tôi muốn cảm ơn sự giúp đỡ của bạn.
            I am sorry to tell you that I cannot come. | Tôi rất tiếc phải báo rằng tôi không thể đến.
            Please accept my apologies for the delay. | Xin hãy nhận lời xin lỗi của tôi vì sự chậm trễ.
            Would it be possible to change the date? | Liệu có thể đổi ngày được không?
            I would recommend that you book in advance. | Tôi khuyên bạn nên đặt trước.
            Could you let me know when the course starts? | Bạn có thể cho tôi biết khi nào khoá học bắt đầu không?
            I am planning to move out on 30th June. | Tôi dự định chuyển đi vào ngày 30 tháng 6.
            I would like to invite you to my birthday party. | Tôi muốn mời bạn đến dự tiệc sinh nhật của tôi.
            ~~~

            ~~~tip Mẹo đủ 120 từ dễ dàng
            Mỗi ý của đề viết **2–3 câu**: câu trả lời + câu giải thích (*because…*) + câu ví dụ/chi tiết (*For example…*). 3 ý × 30 từ + mở 20 từ + kết 15 từ ≈ **125 từ**.
            ~~~
          `,
        },
      ],
    },
    {
      id: 'w3',
      title: 'Phần 3. Task 2 – Bài luận: template vạn năng',
      sections: [
        {
          id: 'w3-universal',
          title: '3.1. Template 4 đoạn dùng cho mọi dạng đề',
          body: md`
            Đề Task 2: _"Write an essay of at least 250 words to an educated reader about the following topic: …"_. Năm dạng chính: **nêu quan điểm (opinion)**, **ưu – nhược điểm (advantages/disadvantages)**, **vấn đề – giải pháp (problem/solution)**, **thảo luận hai mặt (discussion)**, **nguyên nhân – kết quả (causes/effects)**. Cả 5 dạng **dùng chung một khung 4 đoạn**:

            ~~~template Khung 4 đoạn (≈ 260–280 từ)
            **Mở bài (40–50 từ)**
            It is often said that [viết lại đề bằng từ khác]. This issue has become a hot topic in recent years. In this essay, I will discuss [nội dung bài sẽ bàn: both sides / the advantages and disadvantages / the causes and solutions] and give my own opinion.

            **Thân bài 1 (90–100 từ)**
            To begin with, [ý chính 1]. This is because [giải thích]. For example, [ví dụ cụ thể]. As a result, [kết quả].
            In addition, [ý phụ 1]. [Giải thích ngắn].

            **Thân bài 2 (90–100 từ)**
            On the other hand, / Another reason is that [ý chính 2]. This means that [giải thích]. For instance, [ví dụ]. Therefore, [kết quả].
            Moreover, [ý phụ 2]. [Giải thích ngắn].

            **Kết bài (40–50 từ)**
            In conclusion, [tóm tắt 2 ý chính]. From my point of view, [ý kiến cá nhân]. I hope that [mong muốn/đề xuất chung].
            ~~~

            Mỗi đoạn thân bài theo công thức **P-E-E (Point – Explain – Example)**: nêu ý → giải thích → ví dụ. Đây là cách nhanh nhất đạt 90 từ/đoạn.

            ~~~vocab Từ nối "xương sống" của bài luận
            To begin with | /tə bɪˈɡɪn wɪð/ | phr | Trước hết | mở ý thứ nhất
            In addition | /ɪn əˈdɪʃn/ | phr | Thêm vào đó | bổ sung ý
            Moreover | /mɔːrˈəʊvə/ | adv | Hơn nữa | bổ sung ý mạnh hơn
            However | /haʊˈevə/ | adv | Tuy nhiên | đối lập
            On the other hand | | phr | Mặt khác | chuyển sang mặt kia
            For example | | phr | Ví dụ | đưa ví dụ
            As a result | | phr | Kết quả là | nêu kết quả
            Therefore | /ˈðeəfɔː/ | adv | Vì vậy | kết luận ý
            In conclusion | /ɪn kənˈkluːʒn/ | phr | Tóm lại | mở kết bài
            ~~~
          `,
        },
        {
          id: 'w3-types',
          title: '3.2. Biến thể template theo từng dạng đề',
          body: md`
            Chỉ cần đổi **câu cuối mở bài, câu chủ đề 2 thân bài và câu ý kiến ở kết bài**:

            | Dạng đề                                 | Câu cuối mở bài                                                                     | Thân bài 1                     | Thân bài 2                                  | Kết bài                                                                 |
            | --------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------- | ----------------------------------------------------------------------- |
            | **Opinion** (Do you agree or disagree?) | I completely agree with this statement for the following reasons.                   | Lý do 1 đồng ý                 | Lý do 2 đồng ý                              | In conclusion, I strongly believe that…                                 |
            | **Advantages – Disadvantages**          | This essay will look at both the benefits and drawbacks of…                         | The main advantage is that…    | However, there are also some disadvantages. | In conclusion, although X has some drawbacks, its benefits are greater. |
            | **Problem – Solution**                  | This essay will examine the main causes of this problem and suggest some solutions. | One major cause/problem is…    | To solve this problem, … should…            | In conclusion, if… work together, this problem can be solved.           |
            | **Discussion** (Discuss both views)     | This essay will discuss both views before giving my own opinion.                    | Some people believe that…      | Others argue that…                          | In conclusion, while both views have merit, I believe…                  |
            | **Cause – Effect**                      | This essay will discuss the causes and effects of…                                  | There are several reasons why… | This trend has some serious effects.        | In conclusion, … is caused by… and leads to…                            |

            ~~~tip Câu dùng được cho hầu hết đề
            - **Nguyên nhân**: *This is mainly because people are too busy with work and study.*
            - **Kết quả tích cực**: *As a result, people can save time and money.*
            - **Kết quả tiêu cực**: *This can lead to serious health problems such as stress and obesity.*
            - **Giải pháp**: *The government should invest more money in… and schools should teach students how to…*
            - **Ý kiến cá nhân**: *From my point of view, the advantages clearly outweigh the disadvantages.*
            ~~~
          `,
        },
        {
          id: 'w3-sample-opinion',
          title: '3.3. Bài mẫu – Nêu quan điểm',
          body: md`
            ~~~sample Bài mẫu Opinion (~265 từ)
            **Đề:** Some people think that university education should be free for all students. Do you agree or disagree?

            It is often said that higher education should be provided free of charge to every student. This issue has become a hot topic in many countries in recent years. Personally, I completely agree with this idea for the following reasons.

            To begin with, free university education gives everyone an equal chance to succeed. This is because many talented students come from poor families and cannot afford high tuition fees. For example, in my hometown, several of my classmates had to give up their dream of going to university because their parents could not pay for it. As a result, society loses many skilled workers.

            In addition, a free education system benefits the whole country in the long term. When more people have a university degree, they can get better jobs and earn higher salaries. This means that they will pay more taxes and help the economy grow. For instance, countries such as Germany and Finland offer free university education, and they have strong economies and highly skilled workforces. Moreover, graduates do not have to worry about paying back large loans, so they can start their own businesses earlier.

            However, some people argue that free education is too expensive for the government. Although this is true, I believe that education is an investment rather than a cost.

            In conclusion, I strongly believe that university education should be free because it creates equal opportunities and helps the country develop. I hope that more governments will consider this policy in the future.
            ---
            Người ta thường nói giáo dục đại học nên miễn phí cho mọi sinh viên. Vấn đề này trở thành chủ đề nóng ở nhiều nước những năm gần đây. Cá nhân tôi hoàn toàn đồng ý vì những lý do sau.
            Trước hết, đại học miễn phí cho mọi người cơ hội thành công như nhau, vì nhiều sinh viên giỏi xuất thân nghèo không đóng nổi học phí cao. Ví dụ ở quê tôi, vài bạn cùng lớp phải bỏ ước mơ vào đại học vì bố mẹ không lo được. Kết quả là xã hội mất đi nhiều lao động có kỹ năng.
            Thêm vào đó, giáo dục miễn phí có lợi cho cả đất nước về lâu dài. Khi nhiều người có bằng đại học, họ có việc tốt hơn và lương cao hơn, đóng thuế nhiều hơn, giúp kinh tế phát triển. Chẳng hạn Đức và Phần Lan miễn học phí đại học và có nền kinh tế mạnh. Hơn nữa, sinh viên ra trường không phải lo trả khoản vay lớn nên có thể khởi nghiệp sớm hơn.
            Tuy nhiên, có người cho rằng giáo dục miễn phí quá tốn kém cho chính phủ. Dù điều đó đúng, tôi tin giáo dục là khoản đầu tư chứ không phải chi phí.
            Tóm lại, tôi tin đại học nên miễn phí vì tạo cơ hội bình đẳng và giúp đất nước phát triển.
            ~~~
          `,
        },
        {
          id: 'w3-sample-adv',
          title: '3.4. Bài mẫu – Ưu nhược điểm',
          body: md`
            ~~~sample Bài mẫu Advantages/Disadvantages (~260 từ)
            **Đề:** Nowadays, many students choose to study online instead of going to traditional classes. Discuss the advantages and disadvantages of online learning.

            It is often said that online learning is becoming more and more popular among students. This trend has grown quickly since the Covid-19 pandemic. In this essay, I will discuss both the advantages and disadvantages of studying online.

            To begin with, the main advantage of online learning is flexibility. Students can study at any time and in any place as long as they have an internet connection. For example, a student who has a part-time job can watch recorded lectures in the evening. As a result, they can balance work and study more easily. In addition, online courses are often cheaper because students do not have to pay for transport or accommodation.

            On the other hand, online learning also has some serious disadvantages. The biggest problem is the lack of face-to-face interaction. This means that students cannot discuss ideas directly with teachers and classmates, so they may feel lonely and lose motivation. For instance, many of my friends said that they often fell asleep or played games during online lessons. Moreover, not all students have a good computer or a stable internet connection, especially in rural areas.

            In conclusion, online learning is convenient and economical, but it can reduce interaction and motivation. From my point of view, the best solution is to combine online and traditional classes so that students can enjoy the benefits of both.
            ---
            Học trực tuyến ngày càng phổ biến, nhất là sau đại dịch Covid-19. Bài viết bàn về cả ưu và nhược điểm.
            Ưu điểm chính là sự linh hoạt: học mọi lúc mọi nơi miễn có mạng. Ví dụ sinh viên đi làm thêm có thể xem bài giảng ghi sẵn buổi tối, cân bằng việc học và làm dễ hơn. Ngoài ra khoá học trực tuyến thường rẻ hơn vì không mất tiền đi lại, chỗ ở.
            Mặt khác, học trực tuyến có nhược điểm lớn: thiếu tương tác trực tiếp, sinh viên không thảo luận trực tiếp với thầy và bạn nên dễ cô đơn, mất động lực. Nhiều bạn tôi nói thường ngủ gật hoặc chơi game trong giờ học online. Hơn nữa, không phải ai cũng có máy tính tốt hay mạng ổn định, nhất là ở nông thôn.
            Tóm lại, học trực tuyến tiện và tiết kiệm nhưng giảm tương tác và động lực. Theo tôi, tốt nhất là kết hợp học trực tuyến và học trên lớp.
            ~~~
          `,
        },
        {
          id: 'w3-sample-problem',
          title: '3.5. Bài mẫu – Vấn đề và giải pháp',
          body: md`
            ~~~sample Bài mẫu Problem/Solution (~255 từ)
            **Đề:** Many young people today are addicted to social media. What are the causes of this problem and what can be done to solve it?

            It is often said that young people spend too much time on social media nowadays. This has become a serious problem in many countries, including Vietnam. In this essay, I will examine the main causes of this problem and suggest some solutions.

            To begin with, there are several reasons why young people become addicted to social media. The main reason is that apps such as TikTok and Facebook are designed to keep users online as long as possible. This is because they show endless short videos that match each user's interests. In addition, many teenagers feel lonely or stressed, so they use social media to escape from their problems. As a result, they may spend five or six hours a day on their phones.

            To solve this problem, both families and schools should take action. Firstly, parents should set clear rules, for example no phones during meals or after 10 p.m. They should also spend more time doing activities with their children, such as playing sports or cooking together. Secondly, schools should organise more extracurricular activities and teach students how to use the internet in a healthy way. Moreover, young people themselves can use apps that limit their screen time.

            In conclusion, social media addiction is caused by the design of the apps and by young people's stress and loneliness. If parents, schools and young people work together, this problem can be reduced significantly.
            ~~~
          `,
        },
        {
          id: 'w3-checklist',
          title: '3.6. Bảng tự kiểm tra trước khi nộp',
          body: md`
            ~~~note Soát lỗi 3 phút
            - [ ] Đủ **mọi ý** đề hỏi (đánh dấu từng ý trên đề).
            - [ ] Đủ **120 / 250 từ**.
            - [ ] Có **4 đoạn** (Task 2) / **5 phần** (Task 1), giữa các đoạn cách dòng.
            - [ ] Động từ chia đúng: *he/she/it* + **-s**, quá khứ **-ed**, sau *can/should/will* là động từ nguyên mẫu.
            - [ ] Danh từ số nhiều có **-s** (*many students*, *two years*).
            - [ ] Không viết tắt trong Task 2 và thư trang trọng.
            - [ ] Có ít nhất 1 câu điều kiện (*If…, …*), 1 câu mệnh đề quan hệ (*which/who*), 1 câu bị động (*is/are + V3*).
            ~~~
          `,
        },
      ],
    },
    {
      id: 'w4',
      title: 'Phần 4. Xu hướng và đoán đề Viết',
      sections: [
        {
          id: 'w4-trends',
          title: '4.1. Xu hướng Task 1 và Task 2 gần đây',
          body: md`
            Tổng hợp từ các bộ đề luyện thi công bố năm 2025–2026 (mang tính tham khảo):

            **Task 1** - tỷ lệ thư trang trọng/bán trang trọng tăng (xin thư giới thiệu học bổng, xin gia nhập câu lạc bộ tình nguyện, phàn nàn tour du lịch, báo chủ nhà chuyển đi, đề xuất thư viện mua sách). Thư thân mật vẫn phổ biến: rủ cắm trại, kể về thói quen tốt mới, khuyên bạn tự học tiếng Anh, giới thiệu món ăn truyền thống, kể về nghề nghiệp mơ ước.

            **Task 2** - chủ đề quanh **giáo dục** (học trực tuyến, du học, đại học hay học nghề, trẻ em học ngoại ngữ sớm), **công nghệ** (mạng xã hội, trò chơi điện tử, nghiện internet), **công việc** (lương cao hay yêu thích công việc, làm việc tại nhà), **xã hội** (căng thẳng, béo phì, chảy máu chất xám, sống độc thân), **môi trường** (rác thải nhựa, giao thông công cộng).

            Dạng **Problem – Solution** và **Advantages – Disadvantages** xuất hiện nhiều nhất; dạng **Opinion** đứng thứ ba.
          `,
        },
        {
          id: 'w4-predict',
          title: '4.2. 12 đề dự đoán kèm ý tưởng nhanh',
          body: md`
            | #   | Đề dự đoán                                      | Dạng             | Ý tưởng thân bài 1                       | Ý tưởng thân bài 2                    |
            | --- | ----------------------------------------------- | ---------------- | ---------------------------------------- | ------------------------------------- |
            | 1   | Online learning vs traditional classes          | Adv/Dis          | Linh hoạt, rẻ                            | Thiếu tương tác, mất tập trung        |
            | 2   | University or vocational training?              | Discussion       | Đại học: kiến thức rộng, lương cao       | Học nghề: nhanh có việc, thực hành    |
            | 3   | Job satisfaction vs high salary                 | Opinion          | Yêu thích → làm lâu, ít stress           | Lương cao cần cho cuộc sống           |
            | 4   | Social media addiction                          | Problem/Solution | Nguyên nhân: app gây nghiện, cô đơn      | Giải pháp: gia đình, trường học       |
            | 5   | Should children learn a foreign language early? | Opinion          | Trẻ học nhanh, phát âm chuẩn             | Cơ hội việc làm sau này               |
            | 6   | Studying abroad                                 | Adv/Dis          | Bằng cấp quốc tế, ngoại ngữ, trải nghiệm | Tốn kém, nhớ nhà, sốc văn hoá         |
            | 7   | Working from home                               | Adv/Dis          | Tiết kiệm thời gian đi lại               | Cô lập, khó tách công việc – gia đình |
            | 8   | Stress among students/workers                   | Problem/Solution | Áp lực thi cử, việc làm                  | Thể thao, quản lý thời gian           |
            | 9   | Plastic waste                                   | Problem/Solution | Đồ dùng một lần, ý thức kém              | Thuế túi nilon, tái chế               |
            | 10  | Video games: good or bad?                       | Discussion       | Giải trí, tư duy                         | Nghiện, bạo lực, sức khoẻ             |
            | 11  | Public transport should be free                 | Opinion          | Giảm ùn tắc, ô nhiễm                     | Giúp người thu nhập thấp              |
            | 12  | Brain drain                                     | Problem/Solution | Lương thấp, thiếu cơ hội                 | Lương tốt, môi trường nghiên cứu      |

            Luyện viết các đề này trong mục **Luyện tập → Viết** (có đồng hồ, đếm từ, template chèn nhanh, bài mẫu).
          `,
        },
      ],
    },
  ],
};
