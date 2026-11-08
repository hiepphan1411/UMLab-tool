import { md, type VDoc } from './types';

export const grammarDoc: VDoc = {
  id: 'grammar',
  title: 'Ngữ pháp trọng tâm B1',
  subtitle: '10 chủ điểm đủ dùng cho Viết và Nói',
  parts: [
    {
      id: 'g1',
      title: 'Phần 1. Các thì cần dùng',
      sections: [
        {
          id: 'g1-present',
          title: '1.1. Hiện tại đơn và hiện tại tiếp diễn',
          body: md`
            | Thì                    | Công thức                                            | Dùng khi                                     | Dấu hiệu                                       |
            | ---------------------- | ---------------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
            | **Hiện tại đơn**       | S + V(s/es) · S + do/does not + V · Do/Does + S + V? | Thói quen, sự thật, sở thích                 | always, usually, often, every day, once a week |
            | **Hiện tại tiếp diễn** | S + am/is/are + V-ing                                | Đang xảy ra lúc nói; kế hoạch gần đã sắp xếp | now, at the moment, this week                  |

            ~~~say Ví dụ
            I usually get up at six o'clock. | Tôi thường dậy lúc 6 giờ.
            She works for a bank. | Cô ấy làm cho một ngân hàng. (she → works)
            He doesn't like spicy food. | Anh ấy không thích đồ cay.
            I'm studying for the VSTEP exam at the moment. | Hiện giờ tôi đang ôn thi VSTEP.
            We're meeting our teacher tomorrow afternoon. | Chiều mai chúng tôi gặp cô giáo (đã hẹn).
            ~~~

            ~~~warn Lỗi hay gặp
            Quên **-s** với *he/she/it*: ~~He work~~ → **He works**. Động từ kết thúc bằng *-s, -sh, -ch, -x, -o* thêm **-es**: *watches, goes*; phụ âm + y → **-ies**: *study → studies*.
            ~~~
          `,
        },
        {
          id: 'g1-past',
          title: '1.2. Quá khứ đơn và hiện tại hoàn thành',
          body: md`
            | Thì                     | Công thức                                   | Dùng khi                                                    | Dấu hiệu                                        |
            | ----------------------- | ------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
            | **Quá khứ đơn**         | S + V-ed/V2 · S + didn't + V · Did + S + V? | Việc đã xong ở thời điểm xác định                           | yesterday, last week, ago, in 2020              |
            | **Hiện tại hoàn thành** | S + have/has + V3                           | Trải nghiệm; việc bắt đầu trong quá khứ còn kéo dài tới nay | ever, never, already, yet, for, since, recently |

            ~~~say Ví dụ
            I visited Da Nang last summer. | Tôi đã đến Đà Nẵng hè năm ngoái.
            She didn't go to school yesterday. | Hôm qua cô ấy không đi học.
            Have you ever been to Ha Long Bay? | Bạn đã bao giờ đến vịnh Hạ Long chưa?
            I have learned English for three years. | Tôi đã học tiếng Anh được ba năm.
            I have lived here since 2020. | Tôi sống ở đây từ năm 2020.
            ~~~

            ~~~vocab Động từ bất quy tắc hay dùng nhất
            go – went – gone | /ɡəʊ – went – ɡɒn/ | v | đi |
            have – had – had | /hæv – hæd/ | v | có |
            make – made – made | /meɪk – meɪd/ | v | làm |
            take – took – taken | /teɪk – tʊk – ˈteɪkən/ | v | lấy, mang |
            see – saw – seen | /siː – sɔː – siːn/ | v | nhìn thấy |
            buy – bought – bought | /baɪ – bɔːt/ | v | mua |
            think – thought – thought | /θɪŋk – θɔːt/ | v | nghĩ |
            meet – met – met | /miːt – met/ | v | gặp |
            spend – spent – spent | /spend – spent/ | v | tiêu, dành |
            become – became – become | /bɪˈkʌm – bɪˈkeɪm/ | v | trở thành |
            ~~~
          `,
        },
        {
          id: 'g1-future',
          title: '1.3. Tương lai: will và be going to',
          body: md`
            - **will + V**: quyết định ngay lúc nói, dự đoán, hứa hẹn. _I think it_ **will rain** _tomorrow._
            - **be going to + V**: kế hoạch đã định trước, dự đoán có căn cứ. _I'm_ **going to study** _abroad next year._

            ~~~say Ví dụ dùng trong thư và bài nói
            I will send you the photos tomorrow. | Mai mình sẽ gửi ảnh cho bạn.
            We are going to visit our grandparents this weekend. | Cuối tuần này chúng tôi sẽ thăm ông bà.
            In the future, technology will change the way we learn. | Trong tương lai công nghệ sẽ thay đổi cách chúng ta học.
            ~~~
          `,
        },
      ],
    },
    {
      id: 'g2',
      title: 'Phần 2. Cấu trúc "ăn điểm" cho Viết và Nói',
      sections: [
        {
          id: 'g2-compare',
          title: '2.1. So sánh hơn và so sánh nhất',
          body: md`
            |              | Tính từ ngắn (1 âm tiết, 2 âm tiết tận cùng -y)                                 | Tính từ dài                                  |
            | ------------ | ------------------------------------------------------------------------------- | -------------------------------------------- |
            | So sánh hơn  | adj**-er** + than: _cheaper than, easier than_                                  | **more** + adj + than: _more expensive than_ |
            | So sánh nhất | the + adj**-est**: _the cheapest_                                               | **the most** + adj: _the most convenient_    |
            | Bất quy tắc  | good → better → the best; bad → worse → the worst; far → further → the furthest |                                              |

            ~~~say Ví dụ
            Travelling by train is cheaper than travelling by plane. | Đi tàu rẻ hơn đi máy bay.
            Online learning is more flexible than traditional learning. | Học trực tuyến linh hoạt hơn học truyền thống.
            Da Lat is the most beautiful city I have ever visited. | Đà Lạt là thành phố đẹp nhất tôi từng đến.
            The more you practise, the better you speak. | Càng luyện nhiều, bạn nói càng tốt.
            ~~~
          `,
        },
        {
          id: 'g2-conditional',
          title: '2.2. Câu điều kiện loại 1 và 2',
          body: md`
            | Loại       | Công thức                                      | Ý nghĩa                                       |
            | ---------- | ---------------------------------------------- | --------------------------------------------- |
            | **Loại 1** | If + S + V(hiện tại), S + **will** + V         | Có thể xảy ra ở hiện tại/tương lai            |
            | **Loại 2** | If + S + V(quá khứ, _were_), S + **would** + V | Giả định không có thật ở hiện tại; lời khuyên |

            ~~~say Ví dụ
            If the weather is nice, we will go camping. | Nếu thời tiết đẹp, chúng ta sẽ đi cắm trại.
            If people use public transport, there will be less pollution. | Nếu mọi người dùng phương tiện công cộng, ô nhiễm sẽ giảm.
            If I were you, I would talk to your teacher. | Nếu tôi là bạn, tôi sẽ nói chuyện với thầy cô.
            If I had more free time, I would learn to play the guitar. | Nếu có nhiều thời gian rảnh hơn, tôi sẽ học chơi guitar.
            ~~~

            ~~~tip Dùng ở đâu
            Viết thư khuyên bạn: *If I were you, I would…* — Bài luận giải pháp: *If the government invests more in…, people will…* — Part 2 Nói: *If we choose this option, we will save money.*
            ~~~
          `,
        },
        {
          id: 'g2-passive',
          title: '2.3. Câu bị động',
          body: md`
            **Công thức:** S + **be** (chia theo thì) + **V3** (+ by O). Dùng khi muốn nhấn mạnh sự việc, văn trang trọng.

            | Thì                      | Chủ động                           | Bị động                                  |
            | ------------------------ | ---------------------------------- | ---------------------------------------- |
            | Hiện tại đơn             | People speak English everywhere.   | English **is spoken** everywhere.        |
            | Quá khứ đơn              | They built this bridge in 1990.    | This bridge **was built** in 1990.       |
            | Hiện tại hoàn thành      | They have cancelled the flight.    | The flight **has been cancelled**.       |
            | Với động từ khuyết thiếu | We should protect the environment. | The environment **should be protected**. |

            ~~~say Câu bị động dùng trong bài luận
            More money should be spent on education. | Nên chi nhiều tiền hơn cho giáo dục.
            Plastic bags are used every day by millions of people. | Túi nilon được hàng triệu người dùng mỗi ngày.
            It is believed that exercise reduces stress. | Người ta tin rằng tập thể dục giúp giảm căng thẳng.
            ~~~
          `,
        },
        {
          id: 'g2-relative',
          title: '2.4. Mệnh đề quan hệ (who, which, that, where)',
          body: md`
            - **who** — thay cho người: _I have a friend_ **who** _lives in Hue._
            - **which** — thay cho vật: _This is the book_ **which** _I bought yesterday._
            - **that** — thay cho người/vật (không dùng sau dấu phẩy).
            - **where** — nơi chốn: _Hue is the city_ **where** _I was born._
            - **whose** — sở hữu: _She is the girl_ **whose** _father is a doctor._

            ~~~say Câu ăn điểm
            Ha Noi, which is the capital of Vietnam, has a lot of historic buildings. | Hà Nội, thủ đô của Việt Nam, có nhiều công trình lịch sử.
            People who exercise regularly are usually healthier. | Những người tập thể dục đều đặn thường khoẻ mạnh hơn.
            I'd like to visit a place where I can relax. | Tôi muốn đến một nơi mà tôi có thể thư giãn.
            ~~~
          `,
        },
        {
          id: 'g2-modals',
          title: '2.5. Động từ khuyết thiếu',
          body: md`
            **Modal + V nguyên mẫu** (không _to_, không chia): _can, could, should, must, may, might, will, would_. _have to_ thì có chia (_has to, had to_).

            | Modal          | Ý nghĩa                     | Ví dụ                           |
            | -------------- | --------------------------- | ------------------------------- |
            | can / could    | khả năng, xin phép, đề nghị | _Could you help me?_            |
            | should         | lời khuyên                  | _You should see a doctor._      |
            | must / have to | bắt buộc                    | _Students must wear uniforms._  |
            | may / might    | có lẽ                       | _It might rain this afternoon._ |

            ~~~warn
            ~~should to go~~ → **should go**; ~~can speaks~~ → **can speak**.
            ~~~
          `,
        },
        {
          id: 'g2-ving',
          title: '2.6. V-ing hay to V',
          body: md`
            ~~~vocab Động từ + V-ing
            enjoy | /ɪnˈdʒɔɪ/ | v | thích | I enjoy reading books.
            avoid | /əˈvɔɪd/ | v | tránh | Avoid eating too much sugar.
            finish | /ˈfɪnɪʃ/ | v | hoàn thành | I finished doing my homework.
            mind | /maɪnd/ | v | phiền | Would you mind opening the door?
            suggest | /səˈdʒest/ | v | đề nghị | I suggest going by train.
            spend time | | phr | dành thời gian | I spend time playing with my kids.
            be interested in | | phr | thích thú | I'm interested in learning languages.
            look forward to | | phr | mong đợi | I look forward to hearing from you.
            ~~~

            ~~~vocab Động từ + to V
            want | /wɒnt/ | v | muốn | I want to travel abroad.
            decide | /dɪˈsaɪd/ | v | quyết định | She decided to study medicine.
            plan | /plæn/ | v | dự định | We plan to visit Hue.
            hope | /həʊp/ | v | hy vọng | I hope to see you soon.
            would like | | phr | muốn | I would like to invite you.
            need | /niːd/ | v | cần | You need to bring your passport.
            ~~~
          `,
        },
        {
          id: 'g2-linking',
          title: '2.7. Từ nối và câu phức',
          body: md`
            | Quan hệ     | Từ nối                             | Ví dụ                                       |
            | ----------- | ---------------------------------- | ------------------------------------------- |
            | Nguyên nhân | because + mệnh đề / because of + N | _I stayed at home_ **because** _it rained._ |
            | Kết quả     | so, therefore, as a result         | _It rained,_ **so** _I stayed at home._     |
            | Đối lập     | but, however, although             | **Although** _it rained, we went out._      |
            | Bổ sung     | and, also, in addition, moreover   | **In addition**, _it is cheap._             |
            | Mục đích    | to V, so that                      | _I study hard_ **to** _pass the exam._      |
            | Thời gian   | when, while, before, after         | **When** _I was a child, I lived in Hue._   |

            ~~~warn
            Không dùng *although* và *but* trong cùng một câu: ~~Although it rained, but we went out.~~ → **Although it rained, we went out.**
            ~~~
          `,
        },
        {
          id: 'g2-nouns',
          title: '2.8. Danh từ, mạo từ và lượng từ',
          body: md`
            - **a** + âm phụ âm (_a book, a university_ /juː/), **an** + âm nguyên âm (_an apple, an hour_ /aʊə/).
            - **the** — vật đã xác định/duy nhất: _the sun, the government, the Internet_.
            - Danh từ không đếm được (không thêm -s, không dùng a/an): _information, advice, money, furniture, homework, news, equipment_.
            - **many / a few** + danh từ đếm được số nhiều; **much / a little** + không đếm được; **a lot of / lots of** dùng cho cả hai.

            ~~~say Ví dụ
            Can you give me some advice? | Bạn cho tôi vài lời khuyên được không? (không viết advices)
            There is too much traffic in big cities. | Có quá nhiều xe cộ ở các thành phố lớn.
            Many students have part-time jobs. | Nhiều sinh viên làm thêm.
            ~~~
          `,
        },
        {
          id: 'g2-questions',
          title: '2.9. Đặt câu hỏi (dùng trong thư và Part 1)',
          body: md`
            ~~~say Câu hỏi lịch sự
            Could you tell me what time the class starts? | Bạn có thể cho tôi biết lớp học bắt đầu lúc mấy giờ không?
            Do you know where the nearest bank is? | Bạn có biết ngân hàng gần nhất ở đâu không?
            Would it be possible to change my booking? | Tôi có thể đổi đặt chỗ được không?
            How long does it take to get there? | Đến đó mất bao lâu?
            ~~~

            ~~~note
            Câu hỏi gián tiếp (*Could you tell me…, Do you know…*) **không đảo trợ động từ**: *Could you tell me where* **the station is**? (không viết ~~where is the station~~).
            ~~~
          `,
        },
      ],
    },
  ],
};
