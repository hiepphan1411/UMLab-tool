import { md, type VDoc } from './types';

export const speakingDoc: VDoc = {
  id: 'speaking',
  title: 'Kỹ năng Nói (Speaking)',
  subtitle: '3 phần, khoảng 12 phút, thu âm trên máy',
  parts: [
    {
      id: 's1',
      title: 'Phần 1. Tổng quan bài thi Nói',
      sections: [
        {
          id: 's1-structure',
          title: '1.1. Cấu trúc đề',
          body: md`
            | Phần                                                   | Thời gian | Nội dung                                                                                                        | Chuẩn bị |
            | ------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------- | -------- |
            | **Part 1 – Giao tiếp xã hội** (Social interaction)     | ~3 phút   | 2 chủ đề quen thuộc, mỗi chủ đề 3 câu hỏi (sở thích, thói quen, quê hương, học tập…)                            | Không    |
            | **Part 2 – Thảo luận giải pháp** (Solution discussion) | ~4 phút   | 1 tình huống + 3 phương án; chọn phương án tốt nhất, giải thích vì sao và vì sao không chọn 2 phương án còn lại | 1 phút   |
            | **Part 3 – Phát triển chủ đề** (Topic development)     | ~5 phút   | 1 chủ đề + sơ đồ 3 ý gợi ý; trình bày, rồi trả lời 1–3 câu hỏi mở rộng                                          | 1 phút   |

            - Thi **trên máy tính**: đeo tai nghe có micro, đề hiện trên màn hình, câu trả lời được **thu âm** và giám khảo chấm sau (một số nơi vẫn thi trực tiếp với giám khảo).
            - Hết giờ máy tự chuyển câu → phải **nói đủ thời gian nhưng không lan man**.
            - Tiêu chí chấm: **ngữ pháp, từ vựng, phát âm, độ trôi chảy, mức độ phát triển ý** (5 tiêu chí, thang 10).
          `,
        },
        {
          id: 's1-target',
          title: '1.2. Mục tiêu B1 và chiến lược template',
          body: md`
            Nói chiếm 25% điểm tổng và là kỹ năng **dễ nâng điểm nhất bằng template**. Mục tiêu người mất gốc: **5,0–5,5**.

            Giám khảo B1 không chờ câu phức tạp; họ cần:

            1. **Nói liên tục, đủ thời gian** (không im lặng lâu).
            2. **Trả lời đúng câu hỏi** và có **lý do + ví dụ**.
            3. **Phát âm rõ âm cuối** (-s, -ed, -t, -k) và nhấn trọng âm từ cơ bản.
            4. Dùng **từ nối** (first, besides, for example, so).

            ~~~tip Công thức A-R-E cho mọi câu trả lời
            **A – Answer** (trả lời thẳng) → **R – Reason** (lý do: because…) → **E – Example/Extra** (ví dụ hoặc cảm xúc: For example… / That's why…). Mỗi câu Part 1 nói **20–30 giây ≈ 3 câu**.
            ~~~

            ~~~say Câu "câu giờ" tự nhiên khi chưa nghĩ ra
            Well, that's an interesting question. | À, câu hỏi thú vị đấy.
            Let me think about it for a second. | Để tôi nghĩ một chút.
            To be honest, I've never thought about it before, but… | Thật lòng tôi chưa từng nghĩ tới, nhưng…
            I'm not really sure, but I think… | Tôi không chắc lắm, nhưng tôi nghĩ…
            What I mean is… | Ý tôi là…
            ~~~
          `,
        },
      ],
    },
    {
      id: 's2',
      title: 'Phần 2. Part 1 – Giao tiếp xã hội: 8 dạng template',
      sections: [
        {
          id: 's2-review',
          title: '2.1. Có nên học template theo dạng câu hỏi không?',
          body: md`
            **Có — và nên học.** Câu hỏi Part 1 lặp lại theo vài dạng cố định; mỗi dạng một khung câu giúp bạn **trả lời ngay trong 1 giây**, đúng ngữ pháp, đủ dài. 5 dạng bạn đưa ra rất chuẩn. Góp ý để dùng hiệu quả hơn:

            1. Mỗi khung chỉ có 2 câu → nói khoảng 10–12 giây, **hơi ngắn**. Hãy thêm **câu thứ 3** (ví dụ hoặc cảm xúc) để đạt 20–30 giây.
            2. Đừng đọc thuộc lòng y hệt cho mọi câu — giám khảo nhận ra "học vẹt". Thuộc **2–3 cách mở** cho mỗi dạng và đổi luân phiên.
            3. Bổ sung **3 dạng** hay gặp mà 5 dạng chưa phủ: **mô tả người/nơi/vật**, **kế hoạch tương lai**, **câu hỏi lạ/không biết trả lời**.
            4. Lưu ý ngữ pháp: sau _enjoy / like / love / prefer_ dùng **V-ing** (_enjoy listening_); _prefer A_ **to** _B_ (không dùng _rather than_ trong mẫu này); _helps me_ + **V nguyên mẫu** (_helps me relax_).
          `,
        },
        {
          id: 's2-type1',
          title: '2.2. Dạng 1 – Sở thích / Thói quen',
          body: md`
            _What do you like doing in your free time? What do you usually do at weekends? Do you like music?_

            ~~~template Công thức
            Personally, I really enjoy [V-ing] because it helps me [V lợi ích 1]. Besides, I find it a great way to [V lợi ích 2]. For example, [chi tiết: when/where/who with].
            ~~~

            ~~~sample Ví dụ
            Personally, I really enjoy **listening to music** because it helps me **relax** after a long day. Besides, I find it a great way to **improve my mood**. For example, I often listen to pop songs on my way home from work.
            ---
            Cá nhân tôi rất thích nghe nhạc vì nó giúp tôi thư giãn sau một ngày dài. Ngoài ra, tôi thấy đó là cách tuyệt vời để cải thiện tâm trạng. Ví dụ, tôi thường nghe nhạc pop trên đường đi làm về.
            ~~~

            ~~~vocab Cụm lợi ích dùng cho mọi sở thích
            relax | /rɪˈlæks/ | v | thư giãn | helps me relax
            reduce stress | /rɪˈdjuːs stres/ | phr | giảm căng thẳng | It helps me reduce stress.
            stay healthy | /steɪ ˈhelθi/ | phr | giữ sức khoẻ | a great way to stay healthy
            keep fit | /kiːp fɪt/ | phr | giữ dáng | I go jogging to keep fit.
            broaden my knowledge | /ˈbrɔːdn maɪ ˈnɒlɪdʒ/ | phr | mở rộng kiến thức | Reading broadens my knowledge.
            make new friends | | phr | kết bạn mới | a great way to make new friends
            improve my mood | /ɪmˈpruːv maɪ muːd/ | phr | cải thiện tâm trạng | Music improves my mood.
            ~~~
          `,
        },
        {
          id: 's2-type2',
          title: '2.3. Dạng 2 – Lựa chọn / So sánh',
          body: md`
            _Do you prefer A or B? Which do you like better, …? Would you rather… or…?_

            ~~~template Công thức
            I prefer [A] to [B] because [A] is more [tính từ]. Also, [A] allows me to [V lợi ích]. However, [B] is also good when [tình huống].
            ~~~

            ~~~sample Ví dụ
            I prefer **travelling by motorbike** to **travelling by bus** because it is more **flexible**. Also, it allows me to **explore places at my own pace**. However, taking the bus is also a good choice when it rains heavily.
            ---
            Tôi thích đi xe máy hơn đi xe buýt vì nó linh hoạt hơn. Ngoài ra nó cho phép tôi khám phá nơi chốn theo tốc độ của mình. Tuy nhiên, đi xe buýt cũng là lựa chọn tốt khi trời mưa to.
            ~~~

            ~~~note Ngữ pháp
            **prefer + V-ing + to + V-ing**: *I prefer reading* **to** *watching TV.* — **prefer + N + to + N**: *I prefer tea* **to** *coffee.* — Với "Would you rather…?": *I'd rather* **stay** *at home.* (động từ nguyên mẫu).
            ~~~
          `,
        },
        {
          id: 's2-type3',
          title: '2.4. Dạng 3 – Ý kiến / Tầm quan trọng',
          body: md`
            _Is X important? Do you think X is useful? Should people…?_

            ~~~template Công thức
            Yes, I think [chủ đề] is important because it helps people [lợi ích 1]. It can also [lợi ích 2]. That's why [kết luận / lời khuyên].
            ~~~

            ~~~sample Ví dụ
            Yes, I think **learning English** is important because it helps people **communicate with others** around the world. It can also **create more job opportunities**. That's why many parents send their children to English centres.
            ---
            Có, tôi nghĩ học tiếng Anh quan trọng vì nó giúp mọi người giao tiếp với người khác trên khắp thế giới. Nó còn tạo nhiều cơ hội việc làm. Đó là lý do nhiều phụ huynh cho con đi học trung tâm tiếng Anh.
            ~~~

            Muốn trả lời "không": _Well, I don't think X is really necessary because… However, it can be useful when…_
          `,
        },
        {
          id: 's2-type4',
          title: '2.5. Dạng 4 – Tần suất / Thời gian / Quá khứ',
          body: md`
            _How often…? When did you start…? Did you use to…? What did you do last weekend?_

            ~~~template Công thức
            I usually [V] [tần suất: once/twice a week, every morning]. I started doing it [khoảng thời gian] ago, and I enjoy it because [lý do].
            ~~~

            ~~~sample Ví dụ
            I usually **play badminton twice a week** with my friends. I started playing it **a few years ago**, and I enjoy it because it **keeps me active**.
            ---
            Tôi thường chơi cầu lông hai lần một tuần với bạn bè. Tôi bắt đầu chơi từ vài năm trước và tôi thích vì nó giúp tôi năng động.
            ~~~

            ~~~vocab Tần suất và quá khứ
            once a week | /wʌns ə wiːk/ | phr | một lần một tuần |
            twice a month | /twaɪs ə mʌnθ/ | phr | hai lần một tháng |
            every day | | phr | mỗi ngày |
            from time to time | | phr | thỉnh thoảng |
            used to | /ˈjuːst tə/ | phr | đã từng (nay không còn) | I used to play football when I was a child.
            last weekend | | phr | cuối tuần trước | Last weekend I visited my grandparents.
            ~~~

            ~~~warn
            Câu hỏi quá khứ (*Did you…? What did you do…?*) → trả lời bằng **thì quá khứ đơn**: *went, visited, watched, played*. Phát âm rõ đuôi **-ed**: /t/ (watched), /d/ (played), /ɪd/ (visited).
            ~~~
          `,
        },
        {
          id: 's2-type5',
          title: '2.6. Dạng 5 – Trải nghiệm / Mô tả yêu thích',
          body: md`
            _Tell me about… / What is your favourite…? / Have you ever…?_

            ~~~template Công thức
            My favourite [thing/place/activity] is [câu trả lời]. I particularly like it because [lý do]. For example, [chi tiết ngắn]. I really hope to [mong muốn].
            ~~~

            ~~~sample Ví dụ
            My favourite place is **Da Lat**. I particularly like it because the weather is **cool** and the scenery is **beautiful**. For example, I really enjoy walking around **Xuan Huong Lake** in the early morning. I really hope to go back there next summer.
            ---
            Nơi yêu thích của tôi là Đà Lạt. Tôi đặc biệt thích vì thời tiết mát mẻ và phong cảnh đẹp. Ví dụ tôi rất thích đi dạo quanh hồ Xuân Hương vào sáng sớm. Tôi rất mong được quay lại đó vào mùa hè tới.
            ~~~

            Câu hỏi _Have you ever…?_ → _Yes, I have. I [V-ed] … last year/two years ago._ hoặc _No, I haven't, but I'd love to try it one day because…_
          `,
        },
        {
          id: 's2-type678',
          title: '2.7. Dạng 6, 7, 8 – Mô tả, dự định tương lai, câu hỏi lạ',
          body: md`
            **Dạng 6 – Mô tả người/nơi/vật** (_Describe your hometown / your best friend / your house_)

            ~~~template Công thức
            [Tên] is [vị trí/quan hệ]. It/He/She is quite [tính từ 1] and [tính từ 2]. What I like most about it/him/her is [điểm nổi bật]. [Cảm xúc: It always makes me feel…].
            ~~~

            ~~~sample Ví dụ – quê hương
            My hometown is **Hue**, a city in central Vietnam. It is quite **peaceful** and has a lot of **historic buildings**. What I like most about it is the **food**, especially *bun bo Hue*. Whenever I come back, I feel relaxed and happy.
            ~~~

            **Dạng 7 – Kế hoạch tương lai** (_What will you do after graduation? Would you like to…in the future?_)

            ~~~template Công thức
            In the future, I'm planning to [V]. I'd like to do this because [lý do]. To achieve this goal, I'm now [V-ing chuẩn bị].
            ~~~

            ~~~sample Ví dụ
            In the future, I'm planning to **work as a software developer** for a big technology company. I'd like to do this because I love creating useful apps. To achieve this goal, I'm now **improving my English** and **learning new programming skills**.
            ~~~

            **Dạng 8 – Câu hỏi lạ, chưa có ý** — đừng im lặng; dùng câu câu giờ rồi trả lời bằng ý đơn giản nhất:

            ~~~sample Ví dụ – "Do you like collecting things?"
            Well, to be honest, I've never really thought about it. I don't collect anything at the moment, but when I was a child, I used to collect stamps. I think collecting things is a nice hobby because it teaches people to be patient.
            ~~~
          `,
        },
      ],
    },
    {
      id: 's3',
      title: 'Phần 3. Part 2 – Thảo luận giải pháp',
      sections: [
        {
          id: 's3-template',
          title: '3.1. Template Part 2 (nói ~2–3 phút)',
          body: md`
            Đề: một tình huống + **3 phương án**. _"Which option do you think is the best? Why?"_ Bạn có **1 phút chuẩn bị**: chọn phương án **dễ nói nhất** (không cần "đúng nhất"), ghi 2 lý do cho nó và 1 nhược điểm cho mỗi phương án còn lại.

            ~~~template Template Part 2
            In this situation, there are three options: [A], [B] and [C]. In my opinion, [A] is the best choice for the following reasons.

            First of all, [lý do 1]. For example, [ví dụ].
            Secondly, [lý do 2]. This means that [kết quả tốt].

            Now let me explain why I didn't choose the other options.
            [B] might be a good idea, but [nhược điểm]. For instance, [ví dụ].
            As for [C], [nhược điểm], so it is not as suitable as [A].

            So, that's why I think [A] is the best option in this situation.
            ~~~

            ~~~vocab Cụm đánh giá phương án
            convenient | /kənˈviːniənt/ | adj | thuận tiện | It is more convenient.
            time-consuming | /ˈtaɪm kənsjuːmɪŋ/ | adj | tốn thời gian | It is too time-consuming.
            expensive | /ɪkˈspensɪv/ | adj | đắt | It is quite expensive.
            practical | /ˈpræktɪkl/ | adj | thực tế | a more practical choice
            risky | /ˈrɪski/ | adj | rủi ro | It is a bit risky.
            in the long run | | phr | về lâu dài | It is useful in the long run.
            save money | | phr | tiết kiệm tiền | It helps us save money.
            ~~~
          `,
        },
        {
          id: 's3-sample',
          title: '3.2. Bài mẫu Part 2',
          body: md`
            ~~~sample Đề: Gia đình bạn có 1 tuần nghỉ. Chọn: nghỉ dưỡng ở biển, khám phá một thành phố mới, hay ở nhà nghỉ ngơi?
            In this situation, there are three options: going to a beach resort, exploring a new city, or staying at home to rest. In my opinion, going to a beach resort is the best choice for the following reasons.

            First of all, a beach resort is perfect for relaxing. Everyone in my family can swim, lie on the beach and enjoy fresh seafood. For example, last year we went to Nha Trang and my parents said it was the best holiday ever.

            Secondly, a resort has activities for all ages. This means that my grandparents and my little brother can all have fun together.

            Now let me explain why I didn't choose the other options. Exploring a new city might be a good idea, but it is quite tiring because we have to walk a lot and visit many places. As for staying at home, it is cheap, but it is boring and we would not have any special memories, so it is not as suitable as going to the beach.

            So, that's why I think going to a beach resort is the best option in this situation.
            ---
            Trong tình huống này có ba phương án: đi nghỉ dưỡng ở biển, khám phá thành phố mới, hoặc ở nhà nghỉ ngơi. Theo tôi đi biển là lựa chọn tốt nhất.
            Trước hết, khu nghỉ dưỡng biển rất hợp để thư giãn: cả nhà được bơi, nằm trên bãi biển, ăn hải sản tươi. Năm ngoái nhà tôi đi Nha Trang và bố mẹ nói đó là kỳ nghỉ tuyệt nhất.
            Thứ hai, khu nghỉ dưỡng có hoạt động cho mọi lứa tuổi nên ông bà và em trai tôi đều vui.
            Khám phá thành phố mới cũng hay nhưng khá mệt vì phải đi bộ nhiều. Còn ở nhà thì rẻ nhưng chán, không có kỷ niệm đặc biệt.
            Vì vậy tôi nghĩ đi biển là lựa chọn tốt nhất.
            ~~~
          `,
        },
      ],
    },
    {
      id: 's4',
      title: 'Phần 4. Part 3 – Phát triển chủ đề',
      sections: [
        {
          id: 's4-template',
          title: '4.1. Template Part 3 (nói ~3 phút + câu hỏi mở rộng)',
          body: md`
            Đề cho một chủ đề và **sơ đồ 3 ý gợi ý**. Có thể dùng cả 3 ý của đề (dễ nhất) và thêm 1 ý riêng nếu còn thời gian.

            ~~~template Template Part 3
            I'd like to talk about [chủ đề]. In my opinion, [quan điểm chung]. There are three main [reasons / benefits / ways]: [ý 1], [ý 2] and [ý 3].

            Firstly, [ý 1]. This is because [giải thích]. For example, [ví dụ của bản thân].
            Secondly, [ý 2]. [Giải thích]. As a result, [kết quả].
            Finally, [ý 3]. [Giải thích + ví dụ].

            Besides these points, I think [ý riêng (tuỳ chọn)].

            In conclusion, [nhắc lại quan điểm]. That's all I want to say. Thank you for listening.
            ~~~

            ~~~template Trả lời câu hỏi mở rộng (follow-up)
            That's a good question. I think [trả lời]. The main reason is that [lý do]. For example, [ví dụ ngắn].
            ~~~
          `,
        },
        {
          id: 's4-sample',
          title: '4.2. Bài mẫu Part 3',
          body: md`
            ~~~sample Chủ đề: Regular exercise plays an important role in a healthy lifestyle (gợi ý: physical health – mental health – energy & sleep)
            I'd like to talk about the importance of regular exercise. In my opinion, exercise is one of the best ways to live a healthy life. There are three main benefits: it improves our physical health, it is good for our mental health, and it gives us more energy and better sleep.

            Firstly, exercise makes our body stronger. This is because when we move, our heart and muscles work harder. For example, since I started jogging three times a week, I rarely catch a cold.

            Secondly, exercise is good for our mind. When we play sports, we can forget our problems for a while. As a result, we feel less stressed and happier.

            Finally, people who exercise regularly usually have more energy and sleep better at night. For instance, after playing badminton in the evening, I can fall asleep very quickly.

            Besides these points, I think exercising with friends is a great way to make our relationships stronger.

            In conclusion, regular exercise brings many benefits to both our body and mind. That's all I want to say. Thank you for listening.
            ---
            Tôi muốn nói về tầm quan trọng của tập thể dục đều đặn. Theo tôi, đây là một trong những cách tốt nhất để sống khoẻ, với ba lợi ích chính: cải thiện thể chất, tốt cho tinh thần, giúp có nhiều năng lượng và ngủ ngon hơn.
            Thứ nhất, tập luyện làm cơ thể khoẻ hơn vì tim và cơ phải làm việc nhiều hơn. Từ khi tôi chạy bộ ba lần một tuần, tôi hiếm khi bị cảm.
            Thứ hai, thể thao tốt cho tâm trí: khi chơi thể thao ta quên đi vấn đề, bớt căng thẳng và vui hơn.
            Cuối cùng, người tập đều thường nhiều năng lượng và ngủ ngon hơn. Chẳng hạn sau khi chơi cầu lông buổi tối tôi ngủ rất nhanh.
            Ngoài ra, tập cùng bạn bè còn giúp gắn kết các mối quan hệ.
            Tóm lại, tập thể dục đều đặn mang lại nhiều lợi ích cho cả thể chất lẫn tinh thần.
            ~~~
          `,
        },
        {
          id: 's4-pron',
          title: '4.3. Phát âm cần sửa ngay (track 65–69)',
          body: md`
            Sách luyện phần phát âm ở trang 302–306 (track **65–69**). 4 lỗi người Việt hay mắc và **giám khảo trừ điểm rõ nhất**:

            1. **Nuốt âm cuối** — _like, book, want, students_. Đọc rõ /k/, /t/, /s/.
            2. **Đuôi -s/-es**: /s/ sau âm vô thanh (_books, cats_), /z/ sau âm hữu thanh (_dogs, plays_), /ɪz/ sau s, z, ʃ, tʃ, dʒ (_buses, watches_).
            3. **Đuôi -ed**: /t/ (_watched, helped_), /d/ (_played, lived_), /ɪd/ sau t, d (_wanted, needed_).
            4. **Trọng âm từ** — sai trọng âm khiến người nghe không hiểu.

            ~~~vocab Từ hay đọc sai trọng âm
            hotel | /həʊˈtel/ | n | khách sạn | nhấn âm 2
            computer | /kəmˈpjuːtə/ | n | máy tính | nhấn âm 2
            vegetable | /ˈvedʒtəbl/ | n | rau | 3 âm tiết, nhấn âm 1
            comfortable | /ˈkʌmftəbl/ | adj | thoải mái | nhấn âm 1
            interesting | /ˈɪntrəstɪŋ/ | adj | thú vị | nhấn âm 1
            develop | /dɪˈveləp/ | v | phát triển | nhấn âm 2
            photograph | /ˈfəʊtəɡrɑːf/ | n | bức ảnh | nhấn âm 1
            photographer | /fəˈtɒɡrəfə/ | n | nhiếp ảnh gia | nhấn âm 2
            ~~~

            ~~~tip Luyện mỗi ngày 10 phút
            Bật một bài mẫu (nút loa), nghe từng câu rồi **nói đuổi theo (shadowing)**; ghi âm giọng mình ở mục Luyện tập → Nói và so sánh.
            ~~~
          `,
        },
      ],
    },
    {
      id: 's5',
      title: 'Phần 5. Xu hướng và đoán đề Nói',
      sections: [
        {
          id: 's5-trends',
          title: '5.1. Xu hướng gần đây',
          body: md`
            Tổng hợp từ các trang luyện thi công bố năm 2026 (tham khảo, không phải đề chính thức):

            - **Part 1** xoay quanh đời sống hằng ngày: kỳ nghỉ, TV, quê hương, âm nhạc, học tập, công nghệ, thói quen hằng ngày, thời gian rảnh, ăn uống, bạn bè, sở thích, du lịch, phương tiện đi lại, thời tiết, mua sắm, sức khoẻ, nghề nghiệp, mạng xã hội.
            - **Part 2** chuyển dần sang tình huống thực tế 3 phương án: tặng quà cho em họ học giỏi (laptop / chuyến du lịch / tiền), bạn mới tốt nghiệp (học thạc sĩ / đi làm ngay / khoá học nghề ngắn), hàng xóm ồn ào ban đêm (nói chuyện trực tiếp / báo ban quản lý / bỏ qua), trúng xổ số 1 tỷ (mua nhà / kinh doanh / gửi tiết kiệm).
            - **Part 3** ít đánh đố từ học thuật nhưng đòi **phát triển ý sâu hơn**: làm việc nhóm ở trường, hoạt động ngoại khoá, công nghệ trong lớp học, quản lý thời gian, cân bằng công việc – cuộc sống, mạng xã hội, tập thể dục, giao thông công cộng, bảo vệ môi trường, sở thích.
          `,
        },
        {
          id: 's5-predict',
          title: '5.2. Đề dự đoán – luyện trong mục Luyện tập',
          body: md`
            | Part | Chủ đề dự đoán                                                                                                                                                                                                                                                        |
            | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
            | 1    | Hometown – Music · Studies – Technology · Daily routine – Free time · Food · Friends – Hobbies · Travel – Transport · Weather – Shopping · Health – Career · Social media · Holidays – TV                                                                             |
            | 2    | Quà tặng em họ học giỏi · Kỳ nghỉ 1 tuần của gia đình · Bạn vừa tốt nghiệp · Hàng xóm ồn ào · Trúng xổ số · Trường giảm rác nhựa · Đi lại đến trường/chỗ làm · Học thêm kỹ năng mới                                                                                   |
            | 3    | Làm việc theo cặp giúp học tốt hơn · Hoạt động ngoại khoá · Công nghệ trong lớp học · Quản lý thời gian · Cân bằng công việc – cuộc sống · Ảnh hưởng của mạng xã hội · Tập thể dục · Cải thiện giao thông công cộng · Bảo vệ môi trường · Tầm quan trọng của đọc sách |

            ~~~tip Bí quyết phòng thi Nói
            1. Kiểm tra micro ở phần thử âm, nói to rõ, không sát micro quá.
            2. Part 1: trả lời **ngay**, đủ 3 câu (A-R-E). Không hỏi lại giám khảo được (thi máy).
            3. Part 2 và 3: dùng 1 phút chuẩn bị để **ghi từ khoá**, không viết cả câu.
            4. Nói đến khi hết giờ; nếu hết ý, quay lại nêu ví dụ bản thân.
            5. Lỡ nói sai thì tự sửa nhanh (*Sorry, I mean…*) rồi nói tiếp — không dừng lại.
            ~~~
          `,
        },
      ],
    },
  ],
};
