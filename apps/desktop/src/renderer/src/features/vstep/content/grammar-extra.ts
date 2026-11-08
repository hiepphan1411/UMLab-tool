// Ngữ pháp: phần giải thích thêm + mẹo nhớ + bài tập tình huống (khối ~~~quiz) nối vào từng mục, và phần B2.
import { md, type DocPart } from './types';

/** Nội dung nối thêm vào cuối từng mục (theo id mục). */
export const GRAMMAR_MORE: Record<string, string> = {
  'g1-present': md`
    **Giải thích thêm:** hiện tại đơn nói **điều lặp lại / luôn đúng**; hiện tại tiếp diễn nói **điều tạm thời, đang diễn ra quanh thời điểm nói**. So sánh: _I live in Tay Ninh_ (lâu dài) ↔ _I'm living in Hoc Mon this year_ (tạm thời, đi học).

    Động từ **chỉ trạng thái** không dùng tiếp diễn: _know, like, love, want, need, believe, understand, seem_. ~~I'm knowing~~ → **I know**.

    ~~~tip Mẹo nhớ
    "**Thói quen – Sự thật – Thời khoá biểu**" → hiện tại đơn (*The train leaves at 7*). "**Now – Look! – Listen! – this week**" → tiếp diễn.
    ~~~

    ~~~quiz Bài tập: chọn đáp án đúng
    My sister ___ in a bank in Tay Ninh. | work | works | is work | working | B | Chủ ngữ số ít (my sister) + V-s ở hiện tại đơn, việc lâu dài.
    Look! The bus ___. | comes | is coming | come | came | B | "Look!" = đang xảy ra → hiện tại tiếp diễn.
    I ___ the answer to this question. | am knowing | know | knows | knowing | B | "know" là động từ trạng thái, không dùng tiếp diễn.
    How often ___ you play badminton? | do | does | are | is | A | Câu hỏi tần suất với "you" → do + V.
    This week I ___ for my VSTEP exam every night. | study | am studying | studies | studied | B | "this week" + việc tạm thời → tiếp diễn.
    ~~~
  `,
  'g1-past': md`
    **Giải thích thêm:** quá khứ đơn = **đã xong, biết rõ khi nào**; hiện tại hoàn thành = **không nói khi nào** (trải nghiệm) hoặc **kéo dài tới nay** (for/since). Có mốc quá khứ (_yesterday, last year, in 2020, ago_) → **bắt buộc quá khứ đơn**.

    **for** + khoảng thời gian (_for three years_), **since** + mốc (_since 2021, since I was a child_).

    ~~~tip Mẹo nhớ
    "**Có giờ là quá khứ, không giờ là hoàn thành.**" Hỏi *Have you ever…?* → trả lời *Yes, I have* rồi kể chi tiết bằng **quá khứ**: *I went there last summer.*
    ~~~

    ~~~quiz Bài tập
    I ___ to Da Lat last summer. | have gone | went | go | was go | B | "last summer" = mốc quá khứ → quá khứ đơn.
    I ___ in Hoc Mon since 2022. | live | lived | have lived | am living | C | "since 2022" kéo dài tới nay → hiện tại hoàn thành.
    ___ you ever eaten banh canh Trang Bang? | Did | Have | Do | Are | B | "ever" hỏi trải nghiệm → Have you ever + V3.
    She ___ her homework two hours ago. | has finished | finished | finishes | finish | B | "ago" → quá khứ đơn.
    We have known each other ___ ten years. | since | for | in | ago | B | "ten years" là khoảng thời gian → for.
    ~~~
  `,
  'g1-future': md`
    **Thêm:** hiện tại tiếp diễn cũng diễn tả **kế hoạch đã hẹn** (_I'm meeting my teacher at 3_). Sau **when, if, before, after, as soon as** chỉ tương lai thì dùng **hiện tại đơn**: _I will call you when I_ **arrive** (không viết ~~will arrive~~).

    ~~~quiz Bài tập
    Look at those clouds! It ___ rain. | will | is going to | rains | is raining | B | Có dấu hiệu (mây) → be going to.
    The phone is ringing. - OK, I ___ answer it. | am going to | will | answer | answered | B | Quyết định ngay lúc nói → will.
    I'll text you when I ___ home. | will get | get | got | am getting | B | Sau "when" (tương lai) dùng hiện tại đơn.
    ~~~
  `,
  'g2-compare': md`
    **Thêm:** so sánh bằng **as + adj + as** (_Hoc Mon is not as crowded as District 1_). Tính từ 2 âm tiết tận cùng **-y** → **-ier** (_busy → busier, easy → easier_); phụ âm – nguyên âm – phụ âm gấp đôi (_big → bigger, hot → hotter_).

    ~~~tip Mẹo nhớ
    Đếm âm tiết: 1 âm tiết → **-er**; từ 3 âm tiết trở lên → **more**. "**good-better-best, bad-worse-worst**" thuộc như câu thần chú.
    ~~~

    ~~~quiz Bài tập
    The bus is ___ than the motorbike. | cheap | cheaper | more cheap | cheapest | B | 1 âm tiết → cheaper than.
    This is the ___ book I have ever read. | interesting | more interesting | most interesting | interestingest | C | Từ dài + so sánh nhất → the most.
    Ho Chi Minh City is ___ than Tay Ninh. | busyer | busier | more busy | busiest | B | busy (y) → busier.
    My English is ___ than last year. | gooder | better | more good | best | B | good → better (bất quy tắc).
    The more you practise, the ___ you speak. | good | better | best | well | B | Cấu trúc càng… càng: the more…, the better…
    ~~~
  `,
  'g2-conditional': md`
    **Thêm:** loại 0 (sự thật): _If you heat water to 100°C, it boils._ **Unless = if… not**: _Unless you study, you will fail._ Câu loại 2 với **be** dùng **were** cho mọi ngôi (_If I were rich…_).

    ~~~tip Mẹo nhớ
    "**Loại 1: hiện – will; loại 2: lùi một thì – would.**" Thấy điều **không có thật** (*If I were you, If I had a car*) → loại 2.
    ~~~

    ~~~quiz Bài tập
    If it ___ tomorrow, we will stay at home. | rains | will rain | rained | rain | A | Loại 1: if + hiện tại đơn.
    If I ___ you, I would talk to the teacher. | am | was | were | be | C | Lời khuyên loại 2: If I were you.
    If I had more money, I ___ a new laptop. | will buy | would buy | buy | bought | B | Loại 2: would + V.
    ___ you hurry, you will miss the bus. | If | Unless | When | Because | B | Unless = if not: nếu không nhanh lên thì lỡ xe.
    If people ___ public transport, there would be fewer traffic jams. | use | used | will use | using | B | Loại 2 (giả định): if + quá khứ.
    ~~~
  `,
  'g2-passive': md`
    **Thêm:** dùng bị động khi **không biết / không cần nói ai làm**, hoặc văn trang trọng. Cấu trúc báo cáo: **It is said/believed/thought that…** rất hợp mở bài luận.

    ~~~tip Mẹo nhớ
    "**Be + V3, be chia theo thì của câu chủ động.**" Đổi câu: tân ngữ lên làm chủ ngữ → thêm be đúng thì → động từ ở dạng V3.
    ~~~

    ~~~quiz Bài tập
    English ___ all over the world. | speaks | is spoken | is speaking | spoke | B | Hiện tại đơn bị động: is + V3.
    This bridge ___ in 1990. | built | was built | is built | has built | B | Quá khứ (1990) bị động: was + V3.
    The flight ___ because of the storm. | has cancelled | has been cancelled | cancelled | is cancel | B | Hiện tại hoàn thành bị động: has been + V3.
    More money should ___ on education. | spend | be spent | spent | spending | B | Modal + be + V3.
    It ___ that exercise reduces stress. | believes | is believed | believed | is believing | B | It is believed that… (người ta tin rằng).
    ~~~
  `,
  'g2-relative': md`
    **Thêm:** mệnh đề **xác định** (không phẩy, cần để hiểu danh từ) ↔ **không xác định** (có phẩy, thêm thông tin; **không dùng that**). Có thể bỏ who/which/that khi nó là **tân ngữ**: _The book (that) I bought…_

    ~~~quiz Bài tập
    The woman ___ lives next door is a doctor. | which | who | whose | where | B | Người, làm chủ ngữ → who.
    Tay Ninh is the place ___ I was born. | which | where | who | when | B | Nơi chốn → where.
    Ha Noi, ___ is the capital, has many lakes. | that | which | who | where | B | Mệnh đề có phẩy không dùng "that" → which.
    I have a friend ___ father is a pilot. | who | whose | which | whom | B | Sở hữu → whose.
    ~~~
  `,
  'g2-modals': md`
    ~~~quiz Bài tập
    You look tired. You ___ go to bed early. | should | must to | can to | should to | A | Lời khuyên: should + V (không có to).
    Students ___ wear uniforms at my school. It's a rule. | must | might | could | would | A | Quy định bắt buộc → must.
    I ___ swim when I was five. | can | could | must | should | B | Khả năng trong quá khứ → could.
    It ___ rain this afternoon, so take an umbrella. | might | must | should to | can to | A | Khả năng có thể xảy ra → might.
    ~~~
  `,
  'g2-ving': md`
    **Thêm:** một số động từ đổi nghĩa: **stop doing** (bỏ hẳn việc đó) ↔ **stop to do** (dừng lại để làm); **remember doing** (nhớ đã làm) ↔ **remember to do** (nhớ phải làm). Sau **giới từ** luôn là **V-ing**: _interested in learning, good at cooking, before going_.

    ~~~tip Mẹo nhớ
    Nhóm "**thích – ghét – tránh – xong – phiền – gợi ý**" (enjoy, mind, avoid, finish, suggest, practise) + **V-ing**. Nhóm "**muốn – định – hứa – hy vọng – quyết định**" (want, plan, promise, hope, decide) + **to V**.
    ~~~

    ~~~quiz Bài tập
    I enjoy ___ to music. | listen | to listen | listening | listened | C | enjoy + V-ing.
    She decided ___ abroad. | study | to study | studying | studied | B | decide + to V.
    I'm interested in ___ new languages. | learn | to learn | learning | learned | C | Sau giới từ (in) → V-ing.
    I look forward to ___ from you. | hear | to hear | hearing | heard | C | "to" ở đây là giới từ → hearing.
    He stopped ___ because it was bad for his health. | smoke | to smoke | smoking | smoked | C | stop doing = bỏ hẳn.
    ~~~
  `,
  'g2-linking': md`
    **Thêm:** **despite / in spite of + N/V-ing** ↔ **although + mệnh đề** (_Despite the rain_ = _Although it rained_). **However** đứng đầu câu, sau nó có dấu phẩy.

    ~~~quiz Bài tập
    ___ it was raining, we went out. | Despite | Although | However | Because of | B | Theo sau là mệnh đề → although.
    ___ the rain, we went out. | Although | Despite | Because | So | B | Theo sau là danh từ → despite.
    I was tired, ___ I went to bed early. | because | so | although | but | B | Kết quả → so.
    The test was difficult. ___, I passed it. | However | Because | So | Although | A | Đối lập giữa hai câu → However,
    She studies hard ___ she wants to pass the exam. | so | because | although | despite | B | Nguyên nhân → because.
    ~~~
  `,
  'g2-nouns': md`
    ~~~quiz Bài tập
    Can you give me some ___? | advices | advice | an advice | advicees | B | advice không đếm được.
    There ___ a lot of traffic this morning. | were | was | are | have | B | traffic không đếm được → was.
    I have ___ friends in Ho Chi Minh City. | much | a few | a little | little | B | friends đếm được số nhiều → a few.
    She is ___ honest person. | a | an | the | - | B | honest đọc /ˈɒnɪst/ (âm h câm) → an.
    ~~~
  `,
  'g2-questions': md`
    ~~~quiz Bài tập
    Could you tell me where ___? | is the station | the station is | does the station | the station be | B | Câu hỏi gián tiếp: không đảo ngữ.
    Do you know what time ___? | does the class start | the class starts | starts the class | the class start | B | Câu gián tiếp: chủ ngữ + động từ chia bình thường.
    ~~~
  `,
};

export const GRAMMAR_B2: DocPart = {
  id: 'g3',
  title: 'Phần 3. Nâng cao lên B2',
  sections: [
    {
      id: 'g3-cond3',
      title: '3.1. Câu điều kiện loại 3 và hỗn hợp, câu ước (wish)',
      body: md`
        | Loại                | Công thức                                  | Ý nghĩa                                        |
        | ------------------- | ------------------------------------------ | ---------------------------------------------- |
        | **Loại 3**          | If + **had + V3**, S + **would have + V3** | Giả định ngược lại với **quá khứ** (tiếc nuối) |
        | **Hỗn hợp**         | If + had + V3, S + **would + V** (now)     | Quá khứ khác đi thì **bây giờ** khác           |
        | **Wish (hiện tại)** | S + wish + S + **V2/were**                 | Ước điều trái hiện tại                         |
        | **Wish (quá khứ)**  | S + wish + S + **had + V3**                | Tiếc điều đã xảy ra                            |

        ~~~say Ví dụ
        If I had studied harder, I would have passed the exam. | Nếu tôi học chăm hơn thì đã đậu (nhưng tôi đã không học).
        If I had taken the job, I would be rich now. | Nếu hồi đó nhận việc thì giờ tôi đã giàu.
        I wish I could speak English fluently. | Ước gì tôi nói tiếng Anh trôi chảy.
        I wish I had started learning English earlier. | Giá mà tôi bắt đầu học tiếng Anh sớm hơn.
        ~~~

        ~~~quiz Bài tập
        If I ___ earlier, I wouldn't have missed the train. | left | had left | have left | would leave | B | Loại 3: If + had + V3.
        If she had studied, she ___ the test. | would pass | would have passed | passed | will pass | B | Loại 3: would have + V3.
        I wish I ___ more free time now. | have | had | will have | would had | B | Wish hiện tại → quá khứ đơn.
        I wish I ___ to the party last night. | went | had gone | go | have gone | B | Tiếc quá khứ → had + V3.
        ~~~
      `,
    },
    {
      id: 'g3-reported',
      title: '3.2. Câu tường thuật (reported speech)',
      body: md`
        Lùi thì: hiện tại đơn → quá khứ đơn; hiện tại tiếp diễn → quá khứ tiếp diễn; quá khứ/hiện tại hoàn thành → quá khứ hoàn thành; **will → would, can → could**. Đổi đại từ và trạng từ: _now → then, today → that day, tomorrow → the next day, here → there_.

        ~~~say Ví dụ
        "I am tired," she said. → She said (that) she was tired. | Cô ấy nói cô ấy mệt.
        "Where do you live?" he asked. → He asked me where I lived. | Anh ấy hỏi tôi sống ở đâu (không đảo ngữ).
        "Don't be late," the teacher said. → The teacher told us not to be late. | Cô dặn chúng tôi đừng đến muộn.
        ~~~

        ~~~quiz Bài tập
        "I will help you," he said. → He said he ___ help me. | will | would | can | shall | B | will → would.
        "Do you like coffee?" → She asked me ___ coffee. | do I like | if I liked | did I like | if I like | B | Câu hỏi Yes/No → if/whether + lùi thì, không đảo.
        "Close the door," she said. → She told me ___ the door. | close | to close | closing | closed | B | Câu mệnh lệnh → told + O + to V.
        ~~~
      `,
    },
    {
      id: 'g3-used',
      title: '3.3. used to / be used to / get used to; nhờ ai làm (have something done)',
      body: md`
        - **used to + V**: thói quen trong quá khứ, nay không còn. _I used to play football every afternoon._
        - **be used to + V-ing/N**: đã quen với. _I am used to getting up early._
        - **get used to + V-ing/N**: dần quen với. _I'm getting used to living in Ho Chi Minh City._
        - **have/get + something + V3**: nhờ/thuê người làm. _I had my laptop repaired yesterday._

        ~~~quiz Bài tập
        When I was a child, I ___ swim in the river. | used to | am used to | get used to | use to | A | Thói quen quá khứ → used to + V.
        I'm used to ___ in a big city now. | live | living | lived | lives | B | be used to + V-ing.
        I had my hair ___ yesterday. | cut | cutting | to cut | cuts | A | have + O + V3 (cut – cut – cut).
        ~~~
      `,
    },
    {
      id: 'g3-advanced',
      title: '3.4. Cấu trúc "ăn điểm" B2: mệnh đề phân từ, đảo ngữ, câu chẻ',
      body: md`
        ~~~say Mẫu câu B2 dùng được trong Viết và Nói
        Having finished my homework, I went out with my friends. | Làm xong bài tập, tôi đi chơi với bạn (mệnh đề phân từ).
        Not only is online learning flexible, but it is also cheap. | Học online không những linh hoạt mà còn rẻ (đảo ngữ).
        It is the cost of living that makes big cities difficult for students. | Chính chi phí sinh hoạt khiến thành phố lớn khó khăn với sinh viên (câu chẻ).
        What I like most about my hometown is its peaceful atmosphere. | Điều tôi thích nhất ở quê là không khí yên bình.
        The more people use public transport, the less pollution there will be. | Càng nhiều người đi xe công cộng, ô nhiễm càng giảm.
        ~~~

        ~~~tip Cách dùng khi thi
        Mỗi bài viết/nói chỉ cần **1–2 câu** kiểu này là đủ thể hiện trình độ B2; đừng nhồi quá nhiều dễ sai.
        ~~~

        ~~~quiz Bài tập
        ___ the email, she turned off the computer. | Having sent | Have sent | Sent | To send | A | Hành động xong trước → Having + V3.
        Not only ___ cheap, but it is also convenient. | the bus is | is the bus | does the bus | the bus | B | Not only đầu câu → đảo trợ động từ.
        It was my mother ___ taught me to cook. | which | who | what | whom | B | Câu chẻ nhấn mạnh người → It was… who…
        ~~~
      `,
    },
  ],
};
