import type { VstepSetInput } from '@umlab/core';

/** Đề Nghe mô phỏng: lời thoại đọc bằng giọng máy (không cần tệp âm thanh). */
export const listeningTts1: VstepSetInput = {
  id: 'builtin-listening-tts-1',
  title: 'Đề Nghe mô phỏng 1 (giọng máy – 17 câu)',
  description: 'Part 1 (8 câu), 1 hội thoại Part 2 (4 câu), 1 bài nói Part 3 (5 câu). Lời thoại hiện sau khi nộp bài.',
  skill: 'listening',
  level: 'B1',
  minutes: 25,
  sections: [
    {
      title: 'Part 1 – Đoạn 1',
      part: 1,
      tts: 'Woman: Excuse me, which platform does the train to Hai Phong leave from?\nMan: Platform three, but hurry up. It leaves in five minutes.',
      questions: [
        {
          prompt: 'Where are the speakers?',
          options: ['At an airport', 'At a train station', 'At a bus stop', 'At a harbour'],
          answer: 1,
          explain: '"platform" và "train" → nhà ga.',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 2',
      part: 1,
      tts: "Man: Hello, this is David from City Dental Clinic. I'm calling to remind you about your appointment tomorrow at ten thirty. Please arrive ten minutes early to fill in a form.",
      questions: [
        {
          prompt: 'What is the purpose of the message?',
          options: [
            'To cancel an appointment',
            'To remind someone of an appointment',
            'To ask for payment',
            'To advertise a clinic',
          ],
          answer: 1,
          explain: '"I\'m calling to remind you about your appointment".',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 3',
      part: 1,
      tts: "Woman: The meeting was planned for two o'clock, wasn't it?\nMan: Yes, but the manager has moved it to half past three because she has a visitor.",
      questions: [
        {
          prompt: 'What time will the meeting start?',
          options: ['2:00', '2:30', '3:00', '3:30'],
          answer: 3,
          explain: '"moved it to half past three" = 3:30. Hai giờ là giờ cũ (bẫy).',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 4',
      part: 1,
      tts: "Woman: Good morning. I'd like to open a savings account, please.\nMan: Certainly. Could I see your ID card? And how much would you like to deposit today?",
      questions: [
        {
          prompt: 'Who is the man most likely to be?',
          options: ['A bank clerk', 'A shop assistant', 'A police officer', 'A teacher'],
          answer: 0,
          explain: '"savings account", "deposit" → nhân viên ngân hàng.',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 5',
      part: 1,
      tts: "Man: Are you coming to the football match tonight?\nWoman: I'd love to, but I have to finish my essay. It's due tomorrow morning.",
      questions: [
        {
          prompt: "Why can't the woman go to the match?",
          options: [
            'She is ill',
            'She has to work late',
            'She has an assignment to finish',
            "She doesn't like football",
          ],
          answer: 2,
          explain: '"finish my essay… due tomorrow" = bài tập phải nộp (paraphrase: assignment).',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 6',
      part: 1,
      tts: 'Woman: Attention, shoppers. Our store will close in fifteen minutes. Please take your items to the checkout. Thank you for shopping with us.',
      questions: [
        {
          prompt: 'What are listeners asked to do?',
          options: ['Leave the store immediately', 'Go to the checkout', 'Visit the fifth floor', 'Use the stairs'],
          answer: 1,
          explain: '"Please take your items to the checkout".',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 7',
      part: 1,
      tts: "Man: These shoes look nice, but they're a bit tight.\nWoman: Would you like to try a bigger size? We have them in forty-two.\nMan: Yes, please.",
      questions: [
        {
          prompt: 'What will the man probably do next?',
          options: ['Buy the shoes', 'Try on a larger size', 'Leave the shop', 'Ask for a discount'],
          answer: 1,
          explain: 'Câu "do next" → nghe câu cuối: đồng ý thử cỡ lớn hơn.',
        },
      ],
    },
    {
      title: 'Part 1 – Đoạn 8',
      part: 1,
      tts: "Woman: How was the new restaurant?\nMan: The food wasn't bad, but honestly, the service was terribly slow. We waited almost an hour.",
      questions: [
        {
          prompt: 'What did the man complain about?',
          options: ['The food', 'The price', 'The service', 'The location'],
          answer: 2,
          explain: 'Sau "but honestly" là ý chính: phục vụ chậm. "wasn\'t bad" nghĩa là đồ ăn ổn (bẫy phủ định).',
        },
      ],
    },
    {
      title: 'Part 2 – Hội thoại: đăng ký khoá học',
      part: 2,
      tts: `Woman: Hello, I'm calling about the evening English course I saw on your website.
Man: Sure. We have two evening classes, one on Mondays and Wednesdays, and one on Tuesdays and Thursdays.
Woman: I work late on Mondays, so the Tuesday and Thursday class would be better. How long is the course?
Man: It lasts ten weeks, and each lesson is two hours, from seven to nine.
Woman: And how much does it cost?
Man: The full price is three million dong, but if you register before the end of this month, you get a ten percent discount.
Woman: Great. Do I need to take a test first?
Man: Yes, there's a short placement test so we can put you in the right level. You can do it online. I'll email you the link today.
Woman: Perfect, thank you.`,
      questions: [
        {
          prompt: 'Why is the woman calling?',
          options: [
            'To complain about a course',
            'To ask about an English course',
            'To cancel her registration',
            'To apply for a teaching job',
          ],
          answer: 1,
          explain: '"I\'m calling about the evening English course".',
        },
        {
          prompt: 'Why does the woman choose the Tuesday and Thursday class?',
          options: ['It is cheaper', 'She works late on Mondays', 'The teacher is better', 'It starts earlier'],
          answer: 1,
          explain: '"I work late on Mondays".',
        },
        {
          prompt: 'How can the woman get a discount?',
          options: [
            'By paying in cash',
            'By bringing a friend',
            'By registering before the end of the month',
            'By taking the test online',
          ],
          answer: 2,
          explain: '"if you register before the end of this month, you get a ten percent discount".',
        },
        {
          prompt: 'What will the man do today?',
          options: ['Call the woman back', 'Send her a link by email', 'Meet her at the centre', 'Give her a book'],
          answer: 1,
          explain: '"I\'ll email you the link today".',
        },
      ],
    },
    {
      title: 'Part 3 – Bài nói: loài ong',
      part: 3,
      tts: `Man: Good morning, everyone. Today we're going to look at an insect that is small but extremely important for our food supply: the honeybee.
First of all, many people think bees are only useful because they make honey. In fact, their most valuable job is pollination. When bees move from flower to flower, they carry pollen, which allows plants to produce fruit and seeds. About one third of the food we eat, including apples, coffee and almonds, depends on this process.
Unfortunately, bee populations have been falling in many parts of the world. Scientists believe there are several causes. One is the use of chemicals on farms that kill insects. Another is the loss of wild flowers as cities grow larger.
So what can ordinary people do? Surprisingly, quite a lot. Planting flowers in gardens or even on balconies gives bees food. Avoiding chemical sprays at home also helps.
To sum up, protecting bees is not only about saving an insect. It is about protecting the food on our tables.`,
      questions: [
        {
          prompt: 'What is the talk mainly about?',
          options: [
            'How to make honey',
            'The importance of honeybees',
            'Farming in cities',
            'Different kinds of flowers',
          ],
          answer: 1,
          explain: 'Câu mở: "an insect that is… extremely important… the honeybee".',
        },
        {
          prompt: "According to the speaker, what is the bees' most valuable job?",
          options: ['Making honey', 'Pollination', 'Killing other insects', 'Producing wax'],
          answer: 1,
          explain: '"their most valuable job is pollination".',
        },
        {
          prompt: 'How much of our food depends on pollination?',
          options: ['About a quarter', 'About one third', 'About half', 'Almost all'],
          answer: 1,
          explain: '"About one third of the food we eat".',
        },
        {
          prompt: 'Which is mentioned as a cause of falling bee populations?',
          options: ['Cold weather', 'Farm chemicals', 'Too much honey production', 'Bird attacks'],
          answer: 1,
          explain: '"the use of chemicals on farms that kill insects".',
        },
        {
          prompt: 'Why does the speaker say "Surprisingly, quite a lot"?',
          options: [
            'To show that ordinary people can help more than expected',
            'To criticise scientists',
            'To change the topic to honey',
            'To ask the audience a question',
          ],
          answer: 0,
          explain: 'Câu hỏi mục đích câu nói: nhấn mạnh người bình thường có thể giúp nhiều hơn ta nghĩ.',
        },
      ],
    },
  ],
};

export const writingSet: VstepSetInput = {
  id: 'builtin-writing-1',
  title: 'Đề Viết dự đoán (10 thư + 12 bài luận)',
  skill: 'writing',
  level: 'B1-B2',
  writing: [
    {
      id: 'w1-camping',
      task: 1,
      kind: 'informal',
      title: 'Rủ bạn đi cắm trại',
      minWords: 120,
      minutes: 20,
      prompt:
        'You are planning a camping trip this weekend. Write an email to invite your friend Alex. In your email, you should:\n- say where you will go\n- describe the activities you plan to do\n- tell Alex what to bring.',
      outline:
        'Mở: hỏi thăm + mời đi cắm trại.\nÝ 1: địa điểm (Ba Vì, cách HN 60 km, không khí trong lành).\nÝ 2: hoạt động (leo núi, nướng BBQ, lửa trại, ngắm sao).\nÝ 3: mang áo ấm, đèn pin, đồ ăn vặt; mình lo lều.\nKết: mong bạn đi, trả lời trước thứ Năm.',
    },
    {
      id: 'w1-career',
      task: 1,
      kind: 'informal',
      title: 'Kể về nghề mơ ước',
      minWords: 120,
      minutes: 20,
      prompt:
        'Your friend Sam asked about your future career. Write an email to Sam. In your email, you should:\n- describe your dream job\n- explain why you chose it\n- say what you are doing now to prepare for it.',
      outline:
        'Ý 1: lập trình viên / giáo viên…\nÝ 2: thích sáng tạo, lương tốt, giúp ích xã hội.\nÝ 3: học tiếng Anh, làm dự án, thực tập.',
    },
    {
      id: 'w1-scholar',
      task: 1,
      kind: 'formal',
      title: 'Xin thư giới thiệu học bổng',
      minWords: 120,
      minutes: 20,
      prompt:
        'You are applying for a scholarship to study abroad. Write a letter to Dr Helen, your professor, to ask for a letter of recommendation. In your letter, you should:\n- give the name of the scholarship and explain why you need her letter\n- remind her of your achievements in her class\n- explain how she can submit the letter and the deadline.',
      outline:
        'Dear Dr Helen, I am writing to request…\nÝ 1: học bổng Chevening/ thạc sĩ; hồ sơ yêu cầu 2 thư giới thiệu.\nÝ 2: điểm A môn của cô, giải nhất bài thuyết trình nhóm.\nÝ 3: gửi email trực tiếp cho hội đồng trước 25/6.\nYours sincerely.',
    },
    {
      id: 'w1-selfstudy',
      task: 1,
      kind: 'informal',
      title: 'Khuyên bạn tự học tiếng Anh',
      minWords: 120,
      minutes: 20,
      prompt:
        'Your friend David plans to learn English at home instead of going to a language centre. Write an email to David. In your email, you should:\n- give your opinion about self-study\n- suggest some useful methods or websites\n- explain how to stay motivated every day.',
    },
    {
      id: 'w1-landlord',
      task: 1,
      kind: 'semi-formal',
      title: 'Báo chủ nhà chuyển đi',
      minWords: 120,
      minutes: 20,
      prompt:
        'You are going to move out of your rented apartment next month. Write an email to your landlord, Mr Peterson. In your email, you should:\n- tell him the date you will move out\n- explain why you are moving\n- ask how you can get your deposit back.',
    },
    {
      id: 'w1-club',
      task: 1,
      kind: 'formal',
      title: 'Xin gia nhập CLB tình nguyện',
      minWords: 120,
      minutes: 20,
      prompt:
        'You want to join the volunteer club "Green Earth". Write an email to the club leader. In your email, you should:\n- explain why you want to join\n- describe your relevant skills or experience\n- ask about the meeting schedule and upcoming activities.',
    },
    {
      id: 'w1-habit',
      task: 1,
      kind: 'informal',
      title: 'Kể về thói quen tốt mới',
      minWords: 120,
      minutes: 20,
      prompt:
        'Write an email to your friend Chloe about a good habit you have recently started. In your email, you should:\n- describe the habit\n- explain its benefits\n- give some tips for keeping it up.',
    },
    {
      id: 'w1-tour',
      task: 1,
      kind: 'formal',
      title: 'Phàn nàn về tour du lịch',
      minWords: 120,
      minutes: 20,
      prompt:
        'You recently went on a package tour which had many problems. Write a letter to the manager of the travel agency. In your letter, you should:\n- give details of the tour (dates, destinations)\n- describe the problems\n- say what action you expect the agency to take.',
    },
    {
      id: 'w1-food',
      task: 1,
      kind: 'informal',
      title: 'Giới thiệu món ăn truyền thống',
      minWords: 120,
      minutes: 20,
      prompt:
        'Your friend Mary is interested in Vietnamese traditional food. Write an email to Mary. In your email, you should:\n- name a famous traditional dish and describe its taste\n- explain its main ingredients\n- say when people usually eat it.',
    },
    {
      id: 'w1-library',
      task: 1,
      kind: 'formal',
      title: 'Đề xuất thư viện mua sách',
      minWords: 120,
      minutes: 20,
      prompt:
        'Write a letter to the manager of your university library to suggest buying new books for your major. In your letter, you should:\n- explain why you are writing and state your major\n- suggest specific titles or types of books\n- explain how these books would help students.',
    },
    {
      id: 'w2-online',
      task: 2,
      kind: 'adv-dis',
      title: 'Học trực tuyến',
      minWords: 250,
      minutes: 40,
      prompt:
        'Nowadays, many students choose to study online instead of attending traditional classes. Discuss the advantages and disadvantages of online learning.',
      outline:
        'TB1 ưu: linh hoạt thời gian/địa điểm; rẻ (không đi lại).\nTB2 nhược: thiếu tương tác, mất tập trung; cần máy tính + mạng.\nKL: kết hợp cả hai.',
    },
    {
      id: 'w2-free-uni',
      task: 2,
      kind: 'opinion',
      title: 'Đại học miễn phí',
      minWords: 250,
      minutes: 40,
      prompt: 'Some people think that university education should be free for all students. Do you agree or disagree?',
      outline:
        'Đồng ý. TB1: cơ hội bình đẳng cho SV nghèo. TB2: lợi ích kinh tế dài hạn (Đức, Phần Lan). Phản biện ngắn: tốn ngân sách → là đầu tư.',
    },
    {
      id: 'w2-social',
      task: 2,
      kind: 'problem-solution',
      title: 'Nghiện mạng xã hội',
      minWords: 250,
      minutes: 40,
      prompt:
        'Many young people today are addicted to social media. What are the causes of this problem and what can be done to solve it?',
      outline:
        'Nguyên nhân: app thiết kế gây nghiện; cô đơn, áp lực. Giải pháp: gia đình đặt luật, trường tổ chức hoạt động ngoại khoá, app giới hạn thời gian.',
    },
    {
      id: 'w2-vocational',
      task: 2,
      kind: 'discussion',
      title: 'Đại học hay học nghề',
      minWords: 250,
      minutes: 40,
      prompt:
        'Some people believe that young people should go to university, while others think vocational training is a better choice. Discuss both views and give your opinion.',
    },
    {
      id: 'w2-salary',
      task: 2,
      kind: 'opinion',
      title: 'Lương cao hay yêu thích công việc',
      minWords: 250,
      minutes: 40,
      prompt:
        'Some people think that job satisfaction is more important than a high salary. To what extent do you agree or disagree?',
    },
    {
      id: 'w2-children-lang',
      task: 2,
      kind: 'opinion',
      title: 'Trẻ học ngoại ngữ sớm',
      minWords: 250,
      minutes: 40,
      prompt:
        'Some people believe that children should start learning a foreign language at primary school rather than secondary school. Do you agree or disagree?',
    },
    {
      id: 'w2-abroad',
      task: 2,
      kind: 'adv-dis',
      title: 'Du học',
      minWords: 250,
      minutes: 40,
      prompt:
        'More and more students choose to study abroad. What are the advantages and disadvantages of studying in a foreign country?',
    },
    {
      id: 'w2-wfh',
      task: 2,
      kind: 'adv-dis',
      title: 'Làm việc tại nhà',
      minWords: 250,
      minutes: 40,
      prompt:
        'Working from home has become common in many companies. Discuss the advantages and disadvantages of this trend.',
    },
    {
      id: 'w2-stress',
      task: 2,
      kind: 'problem-solution',
      title: 'Căng thẳng của sinh viên',
      minWords: 250,
      minutes: 40,
      prompt:
        'Many students suffer from stress nowadays. What are the causes of this problem and what solutions can you suggest?',
    },
    {
      id: 'w2-plastic',
      task: 2,
      kind: 'problem-solution',
      title: 'Rác thải nhựa',
      minWords: 250,
      minutes: 40,
      prompt:
        'Plastic waste is becoming a serious environmental problem. What are the causes and what can governments and individuals do to reduce it?',
    },
    {
      id: 'w2-games',
      task: 2,
      kind: 'discussion',
      title: 'Trò chơi điện tử',
      minWords: 250,
      minutes: 40,
      prompt:
        'Some people think video games are harmful to young people, while others believe they have benefits. Discuss both views and give your own opinion.',
    },
    {
      id: 'w2-braindrain',
      task: 2,
      kind: 'problem-solution',
      title: 'Chảy máu chất xám',
      minWords: 250,
      minutes: 40,
      prompt:
        'Many talented people leave their home country to work abroad. Why does this happen and what can be done to solve this problem?',
    },
  ],
};

const P1 = (id: string, topic: string, a: string[], b: string[], sample?: string) => ({
  id,
  part: 1 as const,
  topic,
  questions: [...a, ...b],
  speakSec: 180,
  sample,
});

export const speakingSet: VstepSetInput = {
  id: 'builtin-speaking-1',
  title: 'Đề Nói dự đoán (Part 1, 2, 3)',
  skill: 'speaking',
  level: 'B1-B2',
  speaking: [
    P1(
      'p1-hometown',
      'Hometown – Music',
      [
        'Where is your hometown?',
        'What do you like most about your hometown?',
        'Would you like to live there in the future?',
      ],
      ['Do you like listening to music?', 'What kind of music do you enjoy?', 'When do you usually listen to music?'],
      'My hometown is Hue, a peaceful city in central Vietnam. What I like most about it is the food, especially bun bo Hue. Yes, I would love to live there in the future because life there is quiet and less stressful.\n\nYes, I really enjoy listening to music because it helps me relax after a long day. I prefer pop music to rock music because it is easier to listen to. I usually listen to music on my way to school and before going to bed.',
    ),
    P1(
      'p1-studies',
      'Studies – Technology',
      ['What are you studying at the moment?', 'Why did you choose this subject?', 'Do you enjoy your studies?'],
      [
        'Do you often use the internet?',
        'What do you usually use the internet for?',
        'Has technology changed your daily life? How?',
      ],
    ),
    P1(
      'p1-routine',
      'Daily routine – Free time',
      [
        'What do you usually do in the morning?',
        'Do you have a busy daily routine?',
        'What part of the day do you like most?',
      ],
      [
        'Do you have much free time?',
        'What do you usually do in your free time?',
        'Do you prefer spending your free time alone or with others? Why?',
      ],
    ),
    P1(
      'p1-food',
      'Food – Eating habits',
      [
        'What kind of food do you like?',
        'Do you prefer eating at home or eating out?',
        'Is there any food you dislike?',
      ],
      [
        'How many meals do you usually have a day?',
        'Do you think you have a healthy diet?',
        'Has your eating habit changed recently?',
      ],
    ),
    P1(
      'p1-friends',
      'Friends – Hobbies',
      [
        'Do you have many friends?',
        'What do you usually do with your friends?',
        'What qualities do you value in a good friend?',
      ],
      ['Do you have any hobbies?', 'How often do you spend time on your hobbies?', 'Why do you enjoy these hobbies?'],
    ),
    P1(
      'p1-travel',
      'Travel – Transport',
      ['Do you like travelling?', 'How often do you travel?', 'What kind of places do you like to visit?'],
      [
        'How do you usually travel around your city?',
        'What kind of transport do you like most?',
        'Do you think public transport is convenient in your area?',
      ],
    ),
    P1(
      'p1-weather',
      'Weather – Shopping',
      [
        'What kind of weather do you like most?',
        'What is your favourite season?',
        'Does the weather affect your mood?',
      ],
      [
        'Do you like shopping?',
        'Where do you usually go shopping?',
        'Do you prefer shopping online or in stores? Why?',
      ],
    ),
    P1(
      'p1-health',
      'Health – Career',
      [
        'How do you keep yourself healthy?',
        'Do you often do exercise?',
        'Is it important to have a healthy lifestyle?',
      ],
      [
        'Are you working or studying at the moment?',
        'What kind of job would you like to have in the future?',
        'Is it important to enjoy your job? Why?',
      ],
    ),
    P1(
      'p1-social',
      'Education – Social media',
      ['Do you enjoy learning new things?', 'What is your favourite subject?', 'How do you usually study?'],
      [
        'Do you use social media?',
        'Which social media platform do you use most?',
        'Do you think social media is useful for students?',
      ],
    ),
    P1(
      'p1-holiday',
      'Holidays – TV',
      [
        'What did you do on your last holiday?',
        'Who do you prefer spending your holidays with?',
        'Do you prefer going on holidays abroad?',
      ],
      [
        'How many hours a day do you watch television?',
        'What kinds of programmes do you like?',
        'Do you prefer watching television alone or with others? Why?',
      ],
    ),
    {
      id: 'p2-gift',
      part: 2,
      topic: 'Quà cho em họ học giỏi',
      prompt:
        'Your cousin is the best student of the year. Her parents want to give her a present. They are considering three options: a laptop, a holiday, or some money. Which option would you suggest to them?',
      options: ['A laptop', 'A holiday', 'Some money'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-holiday',
      part: 2,
      topic: 'Kỳ nghỉ một tuần của gia đình',
      prompt:
        'Your family has one week off. You are considering three options: going to a beach resort, exploring a new city, or staying at home to rest. Which option do you think is the best?',
      options: ['A beach resort', 'Exploring a new city', 'Staying at home to rest'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-graduate',
      part: 2,
      topic: 'Bạn vừa tốt nghiệp',
      prompt:
        "Your friend has just graduated from university. He is thinking about three options: doing a master's degree, starting work immediately, or taking a short vocational course. Which option would you recommend?",
      options: ["A master's degree", 'Starting work immediately', 'A short vocational course'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-neighbour',
      part: 2,
      topic: 'Hàng xóm ồn ào ban đêm',
      prompt:
        'Your neighbour often makes a lot of noise late at night. There are three options: talking to the neighbour directly, reporting it to the building management, or ignoring it. Which option is the best?',
      options: ['Talk to the neighbour directly', 'Report to the building management', 'Ignore it'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-lottery',
      part: 2,
      topic: 'Trúng xổ số 1 tỷ',
      prompt:
        'If you won a lottery of 1 billion VND, what would you do with the money? Options: buying a new house, starting a business, or depositing the money in the bank.',
      options: ['Buying a new house', 'Starting a business', 'Depositing the money in the bank'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-plastic',
      part: 2,
      topic: 'Trường giảm rác nhựa',
      prompt:
        'Your school wants to reduce plastic waste. There are three suggestions: banning plastic bottles on campus, giving students free reusable water bottles, or organising a recycling competition. Which option do you think is the most effective?',
      options: ['Ban plastic bottles', 'Free reusable bottles', 'A recycling competition'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-transport',
      part: 2,
      topic: 'Đi lại đến trường',
      prompt:
        'You live 10 km from your university. You are choosing between three ways to get there every day: by motorbike, by bus, or by bicycle. Which one would you choose?',
      options: ['By motorbike', 'By bus', 'By bicycle'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p2-skill',
      part: 2,
      topic: 'Học thêm một kỹ năng',
      prompt:
        'You have some free time this summer and want to learn a new skill. The options are: learning to cook, learning a musical instrument, or learning to drive. Which option is the best for you?',
      options: ['Cooking', 'A musical instrument', 'Driving'],
      prepSec: 60,
      speakSec: 180,
    },
    {
      id: 'p3-pairs',
      part: 3,
      topic: 'Working in pairs helps students learn better at school',
      ideas: ['Learn from each other', 'Become more active in class', 'Develop communication and cooperation skills'],
      followUps: [
        'Do you prefer working alone or in a group?',
        'What problems can happen when students work together?',
        'Should teachers give group grades?',
      ],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-extra',
      part: 3,
      topic: 'Students should be encouraged to take part in extracurricular activities',
      ideas: ['Relieve stress', 'Teamwork and communication', 'Discover interests and talents'],
      followUps: ['What extracurricular activities did you join?', "Can these activities affect students' studies?"],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-tech',
      part: 3,
      topic: 'Using technology in the classroom helps students learn more effectively',
      ideas: ['Quick access to information', 'Interactive lessons', 'More participation'],
      followUps: [
        'Are there any disadvantages of technology in class?',
        'Will computers replace teachers in the future?',
      ],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-time',
      part: 3,
      topic: 'Students should learn how to manage their time effectively',
      ideas: ['Better study planning', 'Less stress', 'Balance between study and personal life'],
      followUps: ['How do you manage your time?', 'Why do many students leave work until the last minute?'],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-balance',
      part: 3,
      topic: 'Work-life balance is important for people who work full-time',
      ideas: ['Rest and less stress', 'Time for family', 'Motivation at work'],
      followUps: [
        'Is it difficult to have a work-life balance in Vietnam?',
        'What can companies do to help their employees?',
      ],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-socialmedia',
      part: 3,
      topic: "Social media has a strong influence on people's daily lives",
      ideas: ['Communication across distance', 'Fast information sharing', 'Addiction and less face-to-face contact'],
      followUps: ['How much time do you spend on social media?', 'Should children under 13 use social media?'],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-exercise',
      part: 3,
      topic: 'Regular exercise plays an important role in a healthy lifestyle',
      ideas: ['Physical health', 'Mental health and stress relief', 'More energy and better sleep'],
      followUps: ["Why don't many people exercise regularly?", 'What sports are popular in Vietnam?'],
      prepSec: 60,
      speakSec: 240,
      sample: 'Xem bài mẫu đầy đủ ở Tài liệu Nói → mục 4.2.',
    },
    {
      id: 'p3-transport',
      part: 3,
      topic: 'Public transportation should be improved in big cities',
      ideas: ['Less traffic congestion', 'Less pollution', 'Convenient and affordable'],
      followUps: ['Do you often use public transport?', 'Should private cars be banned in city centres?'],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-env',
      part: 3,
      topic: 'People should do more to protect the environment',
      ideas: ['Reduce pollution', 'Save natural resources', 'A cleaner living environment'],
      followUps: ['What do you do to protect the environment?', 'Who is more responsible: governments or individuals?'],
      prepSec: 60,
      speakSec: 240,
    },
    {
      id: 'p3-reading',
      part: 3,
      topic: 'Discuss the importance of reading books',
      ideas: ['Open knowledge', 'Improve critical thinking', 'Entertainment'],
      followUps: ['Do young people read less than before?', 'Do you prefer e-books or paper books?'],
      prepSec: 60,
      speakSec: 240,
    },
  ],
};
