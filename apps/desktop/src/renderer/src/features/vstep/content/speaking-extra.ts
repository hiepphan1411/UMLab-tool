// Nói: hồ sơ bản thân (trả lời nhanh mọi câu Part 1) + cách nhận dạng câu hỏi theo từ để hỏi → cách mở câu trả lời.
import { md, type DocSection } from './types';

export const SPEAKING_EXTRA: DocSection[] = [
  {
    id: 's2-profile',
    title: '2.2. Hồ sơ bản thân bằng tiếng Anh (dùng lại cho mọi câu)',
    body: md`
      Thuộc sẵn các câu dưới đây là trả lời được ~70% câu hỏi Part 1. Bật nút **IPA** ở góc khối để luyện phát âm từng câu. (Nếu ngành học của bạn khác, chỉ cần thay cụm _Information Technology_.)

      ~~~say Về bản thân
      My name is Hiep. I'm twenty-two years old. | Tôi tên là Hiệp, 22 tuổi.
      I'm a final-year student at the Industrial University of Ho Chi Minh City. | Tôi là sinh viên năm cuối Đại học Công nghiệp TP.HCM.
      My major is Information Technology. | Chuyên ngành của tôi là Công nghệ thông tin.
      At the moment, I'm working on my graduation project, a smart parking system. | Hiện tôi đang làm đồ án tốt nghiệp, một hệ thống bãi giữ xe thông minh.
      In the future, I'd like to work as a software developer. | Sau này tôi muốn làm lập trình viên.
      ~~~

      ~~~say Nơi sống và quê hương
      I live in Hoc Mon, a suburban district in the north of Ho Chi Minh City. | Tôi sống ở Hóc Môn, một huyện ngoại thành phía bắc TP.HCM.
      It is quite peaceful, and the cost of living is cheaper than in the city centre. | Ở đó khá yên bình và chi phí sinh hoạt rẻ hơn trung tâm.
      My hometown is Tay Ninh, a province about one hundred kilometres from Ho Chi Minh City. | Quê tôi ở Tây Ninh, cách TP.HCM khoảng 100 km.
      It is famous for Ba Den Mountain, the highest mountain in southern Vietnam. | Nơi đây nổi tiếng với núi Bà Đen, ngọn núi cao nhất Nam Bộ.
      It is also famous for rice paper with dew-dried beef and banh canh Trang Bang. | Quê tôi còn nổi tiếng với bánh tráng phơi sương và bánh canh Trảng Bàng.
      I usually go back to Tay Ninh once a month to visit my family. | Tôi thường về Tây Ninh mỗi tháng một lần thăm gia đình.
      ~~~

      ~~~say Sở thích và thói quen
      In my free time, I really enjoy playing badminton with my friends. | Lúc rảnh tôi rất thích chơi cầu lông với bạn bè.
      I usually listen to music on the bus to my university. | Tôi thường nghe nhạc trên xe buýt đến trường.
      I prefer travelling to the mountains to going to the beach. | Tôi thích đi núi hơn đi biển.
      ~~~
    `,
  },
  {
    id: 's2-qtypes',
    title: '2.3. Nhận dạng câu hỏi → mở câu trả lời thế nào',
    body: md`
      Nghe **từ đầu tiên** của câu hỏi là biết phải trả lời kiểu gì và dùng thì nào. Luôn trả lời đủ 3 câu: **Trả lời → Lý do → Ví dụ** (A-R-E).

      | Câu hỏi bắt đầu bằng                                    | Nghĩa là               | Mở câu trả lời                                                             | Thì                    |
      | ------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------- | ---------------------- |
      | **Do/Does/Are/Is you…?**                                | Có hay không           | _Yes, I do. / Not really. / Actually, no…_ + because…                      | Hiện tại đơn           |
      | **What / Which…?**                                      | Cái gì, cái nào        | Gọi tên thứ đó: _My favourite… is… / I usually…_                           | Theo câu hỏi           |
      | **Why…?**                                               | Tại sao                | _The main reason is that… / Because…_                                      | Theo câu hỏi           |
      | **How often…?**                                         | Bao lâu một lần        | _I usually… once/twice a week / every day / rarely_                        | Hiện tại đơn           |
      | **How long…?**                                          | Bao lâu rồi            | _I have… for three years / since 2021_                                     | Hiện tại hoàn thành    |
      | **When / What time…?**                                  | Khi nào                | _Usually in the evening / at weekends / after class_                       |                        |
      | **Where…?**                                             | Ở đâu                  | _I usually… at/in… (place)_                                                |                        |
      | **Who…?**                                               | Ai                     | _I usually… with my friends / my family_                                   |                        |
      | **Did you…? / What did you…?**                          | Quá khứ                | _Yes, I did. Last week I went…_                                            | **Quá khứ đơn** (V-ed) |
      | **Have you ever…?**                                     | Đã bao giờ             | _Yes, I have. I… (quá khứ) last year._ / _No, I haven't, but I'd love to…_ | HTHT → QKĐ             |
      | **Did you use to…?**                                    | Hồi trước có hay không | _Yes, when I was a child, I used to…_                                      | used to + V            |
      | **Will you / Are you going to / What are your plans…?** | Tương lai              | _I'm planning to… / I'm going to… / I'd like to…_                          | Tương lai              |
      | **Would you like to…?**                                 | Có muốn không          | _Yes, I'd love to… because… / I'd rather not…_                             | would                  |
      | **Do you prefer A or B? / Which do you like better?**   | So sánh                | _I prefer A to B because A is more…_                                       |                        |
      | **Do you think…? / Is it important…?**                  | Ý kiến                 | _Yes, I think… because… / In my opinion…_                                  |                        |
      | **What would you do if…?**                              | Giả định               | _If I…, I would…_                                                          | Câu điều kiện loại 2   |
      | **Describe… / Tell me about…**                          | Mô tả                  | _… is… It is quite… What I like most is…_                                  |                        |

      ~~~say Mẫu trả lời theo từng dạng (bật IPA để luyện)
      Do you like cooking? - Yes, I do. I usually cook dinner because it is cheaper and healthier. | Có, tôi thường tự nấu bữa tối vì rẻ và lành mạnh hơn.
      Why do you like your hometown? - The main reason is that it is peaceful and the food is delicious. | Lý do chính là quê tôi yên bình và đồ ăn ngon.
      How often do you go back to Tay Ninh? - I usually go back once a month, at the weekend. | Tôi thường về mỗi tháng một lần, vào cuối tuần.
      How long have you lived in Hoc Mon? - I have lived there for four years, since I started university. | Tôi sống ở đó được 4 năm, từ khi vào đại học.
      What did you do last weekend? - Last weekend I visited my parents and climbed Ba Den Mountain. | Cuối tuần trước tôi về thăm bố mẹ và leo núi Bà Đen.
      Have you ever been abroad? - No, I haven't, but I'd love to visit Japan one day. | Chưa, nhưng tôi rất muốn đi Nhật một lần.
      What would you do if you had more free time? - If I had more free time, I would learn to play the guitar. | Nếu có nhiều thời gian hơn, tôi sẽ học chơi guitar.
      ~~~

      ~~~tip Bí quyết khi không hiểu câu hỏi (thi trên máy không hỏi lại được)
      Bám vào **từ khoá** nghe được (ví dụ chỉ nghe "*…music…*") rồi nói chung về chủ đề đó bằng dạng 1: *Personally, I really enjoy listening to music because…*. Nói đúng chủ đề còn hơn im lặng.
      ~~~
    `,
  },
];
