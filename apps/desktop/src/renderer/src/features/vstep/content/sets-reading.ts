import type { VstepSetInput } from '@umlab/core';

/** Đề Đọc mẫu đủ 4 bài – 40 câu (soạn theo dạng câu hỏi VSTEP, độ khó tăng dần). */
export const readingSet1: VstepSetInput = {
  id: 'builtin-reading-1',
  title: 'Đề Đọc mẫu 1 (4 bài – 40 câu)',
  description: 'Đủ 4 bài như đề thật: email thông báo, bài báo đời sống, bài khoa học phổ thông, bài học thuật.',
  skill: 'reading',
  level: 'B1-B2',
  minutes: 60,
  sections: [
    {
      title: 'Passage 1 – Community Garden',
      part: 1,
      passage: `**To: All residents of Green Park Apartments**
**From: Building Management Office**
**Subject: New community garden**

Dear residents,

We are pleased to announce that the empty area behind Block C will be turned into a community garden. Work will begin on Monday, 3rd March, and the garden is expected to open at the end of April.

The garden will have thirty small plots, each measuring two metres by three metres. Residents who would like to grow their own vegetables, herbs or flowers can rent a plot for 50,000 VND per month. This fee will be used to pay for water, tools and a gardener who will visit twice a week to give advice. Plots will be given out on a first-come, first-served basis, so we recommend that you register early. Each household may rent only one plot.

To register, please fill in the form at the reception desk in Block A before 20th March. You will need to show your resident card. If there are more applications than plots, a waiting list will be created.

During the construction period, the back entrance of Block C will be closed. Residents of Block C are asked to use the main entrance. We apologise for any inconvenience this may cause.

We believe the garden will not only provide fresh, healthy food but also give neighbours a chance to meet and get to know each other. A small opening party will be held in the garden, and all residents are welcome.

If you have any questions, please contact the office on 0243 555 1234 or email us at office@greenpark.vn.

Best regards,
Building Management Office`,
      questions: [
        {
          prompt: 'What is the main purpose of the email?',
          options: [
            'To ask residents to clean the area behind Block C',
            'To inform residents about a new garden',
            'To invite residents to a cooking class',
            'To announce higher water fees',
          ],
          answer: 1,
          explain:
            'Câu đầu: "We are pleased to announce that the empty area… will be turned into a community garden" → thông báo khu vườn mới.',
        },
        {
          prompt: 'When is the garden expected to open?',
          options: ['On 3rd March', 'On 20th March', 'At the end of April', 'At the beginning of May'],
          answer: 2,
          explain: '"the garden is expected to open at the end of April". 3/3 là ngày bắt đầu thi công (bẫy).',
        },
        {
          prompt: 'The word "plots" in paragraph 2 is closest in meaning to',
          options: ['stories', 'small pieces of land', 'plans', 'flower pots'],
          answer: 1,
          explain: 'Plot ở đây là mảnh đất nhỏ (2 m × 3 m). Nghĩa "cốt truyện/âm mưu" không hợp ngữ cảnh.',
        },
        {
          prompt: 'What will the monthly fee NOT be used for?',
          options: ['Water', 'Tools', 'A gardener', 'Seeds'],
          answer: 3,
          explain: 'Bài nêu "water, tools and a gardener" - không nhắc tới hạt giống (seeds).',
        },
        {
          prompt: 'How often will the gardener visit?',
          options: ['Once a week', 'Twice a week', 'Every day', 'Twice a month'],
          answer: 1,
          explain: '"a gardener who will visit twice a week".',
        },
        {
          prompt: 'What does "first-come, first-served" mean?',
          options: [
            'People who register earlier get plots first',
            'The first plot is the most expensive',
            'Only the first thirty families can attend the party',
            'Gardeners serve food to residents',
          ],
          answer: 0,
          explain: 'Ai đến (đăng ký) trước được phục vụ trước → vì vậy bài khuyên "register early".',
        },
        {
          prompt: 'What must residents bring when they register?',
          options: ['Their passport', 'A photo', 'Their resident card', '50,000 VND in cash'],
          answer: 2,
          explain: '"You will need to show your resident card."',
        },
        {
          prompt: 'What will happen if there are too many applications?',
          options: [
            'The fee will increase',
            'A waiting list will be made',
            'More plots will be built',
            'Plots will be shared between families',
          ],
          answer: 1,
          explain: '"If there are more applications than plots, a waiting list will be created."',
        },
        {
          prompt: 'Who is asked to use the main entrance?',
          options: ['All residents', 'Visitors', 'Residents of Block C', 'Residents of Block A'],
          answer: 2,
          explain: '"Residents of Block C are asked to use the main entrance" vì cửa sau Block C đóng.',
        },
        {
          prompt: 'According to the email, what is one social benefit of the garden?',
          options: [
            'It will reduce noise',
            'Neighbours can meet each other',
            'It will increase the value of apartments',
            'Children can play football there',
          ],
          answer: 1,
          explain: '"give neighbours a chance to meet and get to know each other".',
        },
      ],
    },
    {
      title: 'Passage 2 – The Rise of Second-hand Shopping',
      part: 2,
      passage: `Not long ago, many people in Vietnam felt embarrassed about buying second-hand clothes. Used items were seen as something only poor people would choose. Today, however, thrift shops and online second-hand markets are becoming popular, especially among young people in big cities such as Ha Noi and Ho Chi Minh City.

There are several reasons for this change. The first is price. A good-quality jacket that costs one million dong in a shopping mall can often be found for less than a quarter of that price in a thrift shop. For students and young workers with small budgets, this is a big advantage.

The second reason is style. Many young people want to look different from others, and second-hand shops offer unique clothes that are no longer sold in ordinary stores. Some customers enjoy the feeling of "hunting" for rare items, which they then show off on social media.

Environmental awareness is the third reason. The fashion industry is one of the world's biggest polluters. Producing a single cotton T-shirt can use around 2,700 litres of water. By buying used clothes, shoppers help to reduce waste and the demand for new products. A 2025 survey of 1,000 university students in Ha Noi found that 62% had bought at least one second-hand item in the previous year, and nearly half of them said protecting the environment was an important factor in their decision.

However, second-hand shopping is not without problems. Some sellers do not clean the clothes properly, and buyers cannot always return items they do not like. In addition, because the trend has become fashionable, prices in some popular shops have risen sharply.

Despite these drawbacks, experts believe that the market will continue to grow. As one shop owner put it, "People used to ask why I sell old clothes. Now they ask when my next sale is."`,
      questions: [
        {
          prompt: 'What is the passage mainly about?',
          options: [
            'How to clean second-hand clothes',
            'Why second-hand shopping is becoming popular',
            'The history of the fashion industry',
            'How to open a thrift shop',
          ],
          answer: 1,
          explain: 'Bài nói về sự thay đổi thái độ và các lý do mua đồ cũ trở nên phổ biến.',
        },
        {
          prompt: 'In the past, people in Vietnam thought second-hand clothes were',
          options: ['fashionable', 'expensive', 'only for poor people', 'good for the environment'],
          answer: 2,
          explain: '"Used items were seen as something only poor people would choose."',
        },
        {
          prompt: 'According to paragraph 2, a jacket that costs one million dong in a mall may cost in a thrift shop',
          options: [
            'about one million dong',
            'more than 500,000 dong',
            'less than 250,000 dong',
            'exactly 100,000 dong',
          ],
          answer: 2,
          explain: '"less than a quarter of that price" = dưới 1/4 của 1.000.000 → dưới 250.000.',
        },
        {
          prompt: 'The word "unique" in paragraph 3 is closest in meaning to',
          options: ['cheap', 'unusual and special', 'old and dirty', 'popular'],
          answer: 1,
          explain: 'unique = độc nhất, khác biệt; ngữ cảnh "look different from others".',
        },
        {
          prompt: 'Why do some customers enjoy "hunting" for items?',
          options: [
            'Because they can sell them later',
            'Because they like finding rare things',
            'Because the shops are far away',
            'Because they need clothes for work',
          ],
          answer: 1,
          explain: '"enjoy the feeling of hunting for rare items" - thích tìm món hiếm.',
        },
        {
          prompt: 'The writer mentions "2,700 litres of water" in order to',
          options: [
            'show how much water a family uses',
            'explain how cotton is grown',
            'illustrate the environmental cost of fashion',
            'compare prices of T-shirts',
          ],
          answer: 2,
          explain: 'Con số minh hoạ ngành thời trang gây ô nhiễm/tốn tài nguyên (câu hỏi mục đích tác giả).',
        },
        {
          prompt: 'According to the survey, what percentage of students had bought a second-hand item?',
          options: ['Nearly half', '62%', '27%', '100%'],
          answer: 1,
          explain:
            '"62% had bought at least one second-hand item". "Nearly half" là số người coi môi trường là yếu tố quan trọng.',
        },
        {
          prompt: 'Which of the following is NOT mentioned as a problem of second-hand shopping?',
          options: [
            'Clothes may not be clean',
            'Items cannot always be returned',
            'Prices in some shops have risen',
            'The clothes are too small',
          ],
          answer: 3,
          explain: 'Bài nêu: không sạch, không đổi trả được, giá tăng. Không nói quần áo quá nhỏ.',
        },
        {
          prompt: 'The word "drawbacks" in the last paragraph is closest in meaning to',
          options: ['advantages', 'disadvantages', 'customers', 'reasons'],
          answer: 1,
          explain: 'drawback = nhược điểm; "despite these drawbacks" nhắc lại các vấn đề ở đoạn trước.',
        },
        {
          prompt: "What does the shop owner's comment suggest?",
          options: [
            'People are less interested in old clothes',
            'Attitudes towards second-hand clothes have changed',
            'The shop owner is going to close the shop',
            'Sales happen very rarely',
          ],
          answer: 1,
          explain:
            'Trước đây người ta hỏi "sao bán đồ cũ", giờ hỏi "khi nào giảm giá" → thái độ đã thay đổi (suy luận).',
        },
      ],
    },
    {
      title: 'Passage 3 – Why We Need to Sleep',
      part: 3,
      passage: `For centuries, sleep was considered a passive state in which the body and brain simply "switched off". Modern research has shown that this view is completely wrong. During sleep, the brain remains highly active, carrying out tasks that are essential for our health and ability to learn.

One of the most important functions of sleep is memory consolidation. When we learn something new, the information is first stored in a temporary form. During deep sleep, the brain replays the day's experiences and transfers important information into long-term memory. In one well-known experiment, students who slept for eight hours after studying a list of words remembered 40% more of them the next day than students who stayed awake all night.

Sleep also acts as a cleaning system for the brain. Scientists discovered in 2013 that the space between brain cells increases by about 60% during sleep. This allows fluid to flow through the brain more easily and wash away waste products that build up during the day. Some of these waste products are linked to diseases such as Alzheimer's, which suggests that poor sleep over many years may increase the risk of such illnesses.

Lack of sleep affects the body as well as the mind. People who regularly sleep less than six hours a night are more likely to gain weight, because tiredness changes the levels of hormones that control hunger. They also catch colds more often, since sleep helps the immune system to fight infections.

Despite this evidence, many people treat sleep as a luxury. Teenagers are particularly at risk: their natural body clock makes them feel sleepy later at night, yet schools often start early in the morning. As a result, a large number of students attend classes without enough rest. Some countries have experimented with later school start times, and early results show improvements in attendance, mood and test scores.

Experts recommend that adults get seven to nine hours of sleep a night and that teenagers get eight to ten. Simple habits, such as going to bed at the same time each day and avoiding phone screens for an hour before sleep, can make a significant difference.`,
      questions: [
        {
          prompt: 'What was the traditional view of sleep?',
          options: [
            'It was an active process',
            'The brain stopped working during sleep',
            'It helped people learn',
            'It was dangerous',
          ],
          answer: 1,
          explain: '"a passive state in which the body and brain simply switched off".',
        },
        {
          prompt: 'The word "consolidation" in paragraph 2 is closest in meaning to',
          options: ['removal', 'strengthening', 'division', 'creation'],
          answer: 1,
          explain: 'Memory consolidation = củng cố trí nhớ, chuyển thông tin sang trí nhớ dài hạn.',
        },
        {
          prompt: 'In the experiment, students who slept after studying',
          options: [
            'forgot most of the words',
            'remembered 40% more words',
            'studied for eight hours',
            'performed the same as others',
          ],
          answer: 1,
          explain: '"remembered 40% more of them the next day".',
        },
        {
          prompt: 'What happens to the space between brain cells during sleep?',
          options: ['It disappears', 'It decreases by 60%', 'It increases by about 60%', 'It fills with waste'],
          answer: 2,
          explain: '"the space between brain cells increases by about 60%".',
        },
        {
          prompt: 'The word "This" in paragraph 3 refers to',
          options: [
            'the discovery in 2013',
            'the increase in space between brain cells',
            "Alzheimer's disease",
            'waste products',
          ],
          answer: 1,
          explain: '"This allows fluid to flow…" - chính việc khoảng trống tăng lên giúp dịch lưu thông.',
        },
        {
          prompt: 'It can be inferred from paragraph 3 that',
          options: [
            "sleep can cure Alzheimer's",
            'long-term poor sleep may be harmful to the brain',
            'scientists do not know why we sleep',
            'waste products are useful',
          ],
          answer: 1,
          explain: 'Bài nói ngủ kém nhiều năm "may increase the risk" → suy ra có hại; không nói "chữa khỏi".',
        },
        {
          prompt: 'Why do people who sleep less tend to gain weight?',
          options: [
            'They eat late at night',
            'Tiredness affects hunger hormones',
            'They do less exercise',
            'They drink more coffee',
          ],
          answer: 1,
          explain: '"tiredness changes the levels of hormones that control hunger".',
        },
        {
          prompt: 'According to the passage, why are teenagers at risk?',
          options: [
            'They use phones too much',
            'Their body clock and early school times do not match',
            'They do not like school',
            'They need less sleep than adults',
          ],
          answer: 1,
          explain: 'Đồng hồ sinh học khiến buồn ngủ muộn nhưng trường học bắt đầu sớm.',
        },
        {
          prompt: 'Which of the following is NOT mentioned as a result of later school start times?',
          options: ['Better attendance', 'Better mood', 'Higher test scores', 'Fewer school holidays'],
          answer: 3,
          explain: 'Kết quả nêu: attendance, mood, test scores. Không có kỳ nghỉ.',
        },
        {
          prompt: 'What is the main purpose of the last paragraph?',
          options: [
            'To criticise teenagers',
            'To give practical advice',
            'To describe an experiment',
            'To explain how the brain works',
          ],
          answer: 1,
          explain: 'Đưa số giờ khuyến nghị và thói quen đơn giản → lời khuyên thực tế.',
        },
      ],
    },
    {
      title: 'Passage 4 – The Paradox of Choice',
      part: 4,
      passage: `Conventional economic thinking holds that more choice is always better. If consumers have a wider range of options, the argument goes, they are more likely to find a product that perfectly matches their preferences, and competition between suppliers will drive quality up and prices down. In recent decades, however, a growing body of psychological research has challenged this assumption, suggesting that an abundance of options can, paradoxically, leave people less satisfied.

The most frequently cited evidence comes from a study conducted in a supermarket in California. Researchers set up a tasting stand that displayed either six or twenty-four varieties of jam. Although the larger display attracted more shoppers, only 3% of those who stopped at it actually bought a jar, compared with 30% of those who saw the smaller selection. The researchers concluded that excessive choice can produce "choice overload", a state in which people find decision-making so demanding that they postpone it or avoid it altogether.

Psychologist Barry Schwartz has argued that the problem extends beyond simple indecision. When options are plentiful, people tend to raise their expectations, believing that the perfect choice must exist somewhere. Having made a decision, they are more inclined to imagine the attractive features of the alternatives they rejected, which diminishes the pleasure they take in their actual choice. Schwartz distinguishes between "maximisers", who feel compelled to examine every possibility in search of the best, and "satisficers", who settle for an option that meets their basic criteria. His studies indicate that maximisers, despite often making objectively better decisions, report lower levels of happiness.

Subsequent research has, nonetheless, painted a more nuanced picture. A review of fifty experiments published in 2010 found that, on average, the size of an assortment had virtually no effect on satisfaction or purchasing. Choice overload appears to occur only under specific conditions: when people lack clear preferences, when the options are difficult to compare, or when they are under time pressure.

The practical implications are considerable. Businesses have begun to simplify their product ranges, and some governments design "default options" - for example, automatically enrolling employees in pension schemes - so that individuals need not make complex decisions unaided. Critics, however, warn that such measures risk becoming paternalistic, restricting freedom in the name of convenience.`,
      questions: [
        {
          prompt: 'According to conventional economic thinking, more choice',
          options: ['confuses consumers', 'is always beneficial', 'increases prices', 'reduces competition'],
          answer: 1,
          explain: '"Conventional economic thinking holds that more choice is always better."',
        },
        {
          prompt: 'The word "abundance" in paragraph 1 is closest in meaning to',
          options: ['shortage', 'large amount', 'quality', 'variety of prices'],
          answer: 1,
          explain: 'abundance = sự dồi dào, số lượng lớn.',
        },
        {
          prompt: 'In the jam study, what percentage of people who saw 24 varieties bought a jar?',
          options: ['3%', '6%', '24%', '30%'],
          answer: 0,
          explain: '"only 3% of those who stopped at it actually bought a jar" (quầy 24 loại). 30% là quầy 6 loại.',
        },
        {
          prompt: 'What is "choice overload"?',
          options: [
            'Buying too many products',
            'Finding decisions so hard that people delay or avoid them',
            'Having too few options',
            'A marketing strategy',
          ],
          answer: 1,
          explain: '"a state in which people find decision-making so demanding that they postpone it or avoid it".',
        },
        {
          prompt: 'According to Schwartz, why might people enjoy their choices less when there are many options?',
          options: [
            'They spend too much money',
            'They think about the good points of rejected options',
            'They cannot find any good options',
            'They choose too quickly',
          ],
          answer: 1,
          explain: '"more inclined to imagine the attractive features of the alternatives they rejected".',
        },
        {
          prompt: 'Which statement about "maximisers" is true?',
          options: [
            'They accept the first acceptable option',
            'They are happier than satisficers',
            'They often make better decisions but feel less happy',
            'They avoid making decisions',
          ],
          answer: 2,
          explain: '"despite often making objectively better decisions, report lower levels of happiness".',
        },
        {
          prompt: 'The word "nuanced" in paragraph 4 is closest in meaning to',
          options: ['simple', 'more detailed and subtle', 'negative', 'outdated'],
          answer: 1,
          explain: 'nuanced = có nhiều sắc thái, phức tạp hơn - đối lập với kết luận đơn giản trước đó.',
        },
        {
          prompt: 'According to the 2010 review, choice overload occurs',
          options: ['in every situation', 'only under certain conditions', 'only in supermarkets', 'never'],
          answer: 1,
          explain: '"appears to occur only under specific conditions".',
        },
        {
          prompt: 'Why does the writer mention pension schemes?',
          options: [
            'To give an example of a default option',
            'To criticise businesses',
            'To explain the jam study',
            'To show that people are lazy',
          ],
          answer: 0,
          explain: 'Ví dụ cho "default options" mà chính phủ thiết kế.',
        },
        {
          prompt: "What is the critics' concern in the last paragraph?",
          options: [
            'Default options are too expensive',
            'Such measures may limit personal freedom',
            'Businesses offer too few products',
            'Governments make decisions too slowly',
          ],
          answer: 1,
          explain: '"risk becoming paternalistic, restricting freedom in the name of convenience".',
        },
      ],
    },
  ],
};
