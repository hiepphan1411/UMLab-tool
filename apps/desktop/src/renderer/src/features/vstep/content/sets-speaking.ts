// Đề Nói dự đoán + bài mẫu B1–B2 cá nhân hoá: sống ở Hóc Môn (TP.HCM), học Đại học Công nghiệp TP.HCM (IUH),
// quê Tây Ninh. Câu trả lời dùng template 8 dạng (Part 1), template Part 2/Part 3 trong tài liệu Nói.
import type { VstepSetInput } from '@umlab/core';

type VstepSpeakingInput = NonNullable<VstepSetInput['speaking']>[number];

const P1 = (id: string, topic: string, questions: string[], sample: string): VstepSpeakingInput => ({
  id,
  part: 1,
  topic,
  questions,
  speakSec: 180,
  sample,
});
const P2 = (id: string, topic: string, prompt: string, options: string[], sample: string): VstepSpeakingInput => ({
  id,
  part: 2,
  topic,
  prompt,
  options,
  prepSec: 60,
  speakSec: 180,
  sample,
});
const P3 = (id: string, topic: string, ideas: string[], followUps: string[], sample: string): VstepSpeakingInput => ({
  id,
  part: 3,
  topic,
  ideas,
  followUps,
  prepSec: 60,
  speakSec: 240,
  sample,
});

export const SPEAKING_TASKS: VstepSpeakingInput[] = [
  // ======================= PART 1 =======================
  P1(
    'p1-hometown',
    'Hometown – Music',
    [
      'Where is your hometown?',
      'What do you like most about your hometown?',
      'Would you like to live there in the future?',
      'Do you like listening to music?',
      'What kind of music do you enjoy?',
      'When do you usually listen to music?',
    ],
    `*Where is your hometown?*
My hometown is Tay Ninh, a province in the south-east of Vietnam, about one hundred kilometres from Ho Chi Minh City. At the moment I live in Hoc Mon District because it is closer to my university.

*What do you like most about your hometown?*
What I like most about it is Ba Den Mountain, the highest mountain in southern Vietnam. I also love the local food, especially rice paper with dew-dried beef. Whenever I go back, I feel relaxed and happy.

*Would you like to live there in the future?*
Maybe later, yes. Right now I prefer living in Ho Chi Minh City because there are more job opportunities for IT graduates. But when I'm older, I'd like to move back to Tay Ninh because life there is quieter.

*Do you like listening to music?*
Yes, I really enjoy listening to music because it helps me relax after a long day at university. Besides, I find it a great way to stay focused when I study.

*What kind of music do you enjoy?*
I prefer pop music to rock music because it is easier to listen to. I also like some Vietnamese ballads by Den Vau and Son Tung.

*When do you usually listen to music?*
I usually listen to music on the bus from Hoc Mon to my university, and before I go to bed. It makes the journey feel much shorter.`,
  ),
  P1(
    'p1-studies',
    'Studies – Technology',
    [
      'What are you studying at the moment?',
      'Why did you choose this subject?',
      'Do you enjoy your studies?',
      'Do you often use the internet?',
      'What do you usually use the internet for?',
      'Has technology changed your daily life? How?',
    ],
    `*What are you studying at the moment?*
I'm a final-year student at the Industrial University of Ho Chi Minh City, and my major is Information Technology. At the moment I'm working on my graduation project, which is a smart parking system.

*Why did you choose this subject?*
I chose it because I have loved computers since I was a child. Also, IT graduates can find good jobs with high salaries in Vietnam.

*Do you enjoy your studies?*
Yes, I do, although it is sometimes stressful. I particularly enjoy programming because I can create useful apps that solve real problems.

*Do you often use the internet?*
Yes, every day. I think I spend about eight hours a day online, mostly for studying and working.

*What do you usually use the internet for?*
I usually use it to look for information for my project, watch tutorials on YouTube and chat with my friends. I also use it to practise English.

*Has technology changed your daily life? How?*
Yes, a lot. For example, I can pay for almost everything with my phone and order food without leaving home. It saves me a lot of time.`,
  ),
  P1(
    'p1-routine',
    'Daily routine – Free time',
    [
      'What do you usually do in the morning?',
      'Do you have a busy daily routine?',
      'What part of the day do you like most?',
      'Do you have much free time?',
      'What do you usually do in your free time?',
      'Do you prefer spending your free time alone or with others? Why?',
    ],
    `*What do you usually do in the morning?*
I usually get up at six o'clock, have a quick breakfast, usually banh mi, and then take the bus to my university. If I don't have classes, I go to the library to work on my project.

*Do you have a busy daily routine?*
Yes, quite busy. I have classes in the morning and I work on my graduation project in the afternoon, so I rarely have time to rest.

*What part of the day do you like most?*
I like the evening most because I can relax after a long day. I often have dinner with my roommates and then watch a film.

*Do you have much free time?*
Not really. I only have free time at weekends, because this is my final year and I am very busy with my studies.

*What do you usually do in your free time?*
Personally, I really enjoy playing badminton because it helps me stay healthy. Besides, I find it a great way to meet my friends.

*Do you prefer spending your free time alone or with others? Why?*
I prefer spending it with others because it is more fun. However, sometimes I like being alone to read or listen to music.`,
  ),
  P1(
    'p1-food',
    'Food – Eating habits',
    [
      'What kind of food do you like?',
      'Do you prefer eating at home or eating out?',
      'Is there any food you dislike?',
      'How many meals do you usually have a day?',
      'Do you think you have a healthy diet?',
      'Has your eating habit changed recently?',
    ],
    `*What kind of food do you like?*
I really like Vietnamese food, especially broken rice and noodle soup. I also love banh canh Trang Bang, a famous dish from my hometown, Tay Ninh.

*Do you prefer eating at home or eating out?*
I prefer eating at home to eating out because home-cooked food is healthier and cheaper. But when I'm busy, I often eat at small restaurants near my university.

*Is there any food you dislike?*
Yes, I don't really like durian because the smell is too strong for me.

*How many meals do you usually have a day?*
I usually have three meals a day, but sometimes I skip breakfast when I have an early class.

*Do you think you have a healthy diet?*
Not really. I eat a lot of fast food and drink milk tea because they are quick and convenient. I'm trying to eat more vegetables.

*Has your eating habit changed recently?*
Yes. Since I moved to Hoc Mon, I cook for myself more often, so I eat healthier than before.`,
  ),
  P1(
    'p1-friends',
    'Friends – Hobbies',
    [
      'Do you have many friends?',
      'What do you usually do with your friends?',
      'What qualities do you value in a good friend?',
      'Do you have any hobbies?',
      'How often do you spend time on your hobbies?',
      'Why do you enjoy these hobbies?',
    ],
    `*Do you have many friends?*
I have a lot of classmates, but only a few close friends. Most of them are my classmates at IUH, and one is my best friend from high school in Tay Ninh.

*What do you usually do with your friends?*
We usually play badminton, go to coffee shops or study together for exams. Sometimes we go to the cinema at the weekend.

*What qualities do you value in a good friend?*
I think a good friend should be honest and reliable. For example, my best friend always helps me when I have problems.

*Do you have any hobbies?*
Yes. Personally, I really enjoy playing badminton and listening to music because they help me relax.

*How often do you spend time on your hobbies?*
I usually play badminton twice a week, on Tuesday and Saturday evenings. I started playing it about three years ago.

*Why do you enjoy these hobbies?*
Because they keep me healthy and reduce stress, especially when I'm busy with my studies.`,
  ),
  P1(
    'p1-travel',
    'Travel – Transport',
    [
      'Do you like travelling?',
      'How often do you travel?',
      'What kind of places do you like to visit?',
      'How do you usually travel around your city?',
      'What kind of transport do you like most?',
      'Do you think public transport is convenient in your area?',
    ],
    `*Do you like travelling?*
Yes, I love travelling because it helps me relax and learn about new places. My favourite place is Da Lat because the weather is cool.

*How often do you travel?*
Not very often, maybe twice a year, usually during the summer holiday and Tet.

*What kind of places do you like to visit?*
I prefer places with mountains to beaches because they are quieter. For example, I really enjoy climbing Ba Den Mountain in my hometown.

*How do you usually travel around your city?*
I usually travel by bus or by motorbike. From Hoc Mon to my university it takes about forty-five minutes.

*What kind of transport do you like most?*
I prefer travelling by motorbike to travelling by bus because it is more flexible. Also, it allows me to go anywhere I want.

*Do you think public transport is convenient in your area?*
Not really. Buses in Hoc Mon are cheap, but they are often crowded and late. I hope the new metro line will make it more convenient.`,
  ),
  P1(
    'p1-weather',
    'Weather – Shopping',
    [
      'What kind of weather do you like most?',
      'What is your favourite season?',
      'Does the weather affect your mood?',
      'Do you like shopping?',
      'Where do you usually go shopping?',
      'Do you prefer shopping online or in stores? Why?',
    ],
    `*What kind of weather do you like most?*
I like cool and sunny weather most. In Ho Chi Minh City it is hot all year, so I really enjoy the cool weather in December.

*What is your favourite season?*
My favourite season is the dry season, from December to April, because it doesn't rain and I can go out easily.

*Does the weather affect your mood?*
Yes, a little. When it rains heavily, I feel lazy and I don't want to go out. When it is sunny, I feel more energetic.

*Do you like shopping?*
Not really. I only go shopping when I need something, such as clothes or books.

*Where do you usually go shopping?*
I usually go to a supermarket near my house in Hoc Mon, or sometimes to a shopping mall in the city centre.

*Do you prefer shopping online or in stores? Why?*
I prefer shopping online because it is more convenient and often cheaper. However, I buy clothes in stores because I want to try them on first.`,
  ),
  P1(
    'p1-health',
    'Health – Career',
    [
      'How do you keep yourself healthy?',
      'Do you often do exercise?',
      'Is it important to have a healthy lifestyle?',
      'Are you working or studying at the moment?',
      'What kind of job would you like to have in the future?',
      'Is it important to enjoy your job? Why?',
    ],
    `*How do you keep yourself healthy?*
I try to play sports regularly, eat more vegetables and get enough sleep. I also drink a lot of water.

*Do you often do exercise?*
Yes, I play badminton twice a week and I sometimes go jogging in the park near my house.

*Is it important to have a healthy lifestyle?*
Yes, I think a healthy lifestyle is important because it helps people work and study better. It can also prevent many diseases.

*Are you working or studying at the moment?*
I'm studying. I'm a final-year IT student at the Industrial University of Ho Chi Minh City.

*What kind of job would you like to have in the future?*
In the future, I'm planning to work as a software developer for a technology company. To achieve this goal, I'm now improving my English and my programming skills.

*Is it important to enjoy your job? Why?*
Yes, definitely. If you enjoy your job, you will work harder and feel less stressed, so you will be more successful.`,
  ),
  P1(
    'p1-social',
    'Education – Social media',
    [
      'Do you enjoy learning new things?',
      'What is your favourite subject?',
      'How do you usually study?',
      'Do you use social media?',
      'Which social media platform do you use most?',
      'Do you think social media is useful for students?',
    ],
    `*Do you enjoy learning new things?*
Yes, I do. I especially enjoy learning new technologies, because the IT industry changes very quickly.

*What is your favourite subject?*
My favourite subject is web programming, because I can see the result of my work immediately on the screen.

*How do you usually study?*
I usually study in the library at my university or at home in the evening. I often watch online tutorials and then practise by myself.

*Do you use social media?*
Yes, I use it every day, mostly to keep in touch with my friends and family in Tay Ninh.

*Which social media platform do you use most?*
I use Facebook and Zalo most. Zalo is very popular in Vietnam for chatting and making calls.

*Do you think social media is useful for students?*
Yes, I think it is useful because students can share documents and join study groups. However, it can also waste a lot of time if we are not careful.`,
  ),
  P1(
    'p1-holiday',
    'Holidays – TV',
    [
      'What did you do on your last holiday?',
      'Who do you prefer spending your holidays with?',
      'Do you prefer going on holidays abroad?',
      'How many hours a day do you watch television?',
      'What kinds of programmes do you like?',
      'Do you prefer watching television alone or with others? Why?',
    ],
    `*What did you do on your last holiday?*
On my last holiday, I went back to Tay Ninh to visit my family. We climbed Ba Den Mountain and visited the Cao Dai Holy See. It was really relaxing.

*Who do you prefer spending your holidays with?*
I prefer spending my holidays with my family because I don't see them very often since I study in Ho Chi Minh City.

*Do you prefer going on holidays abroad?*
Not really. I prefer travelling in Vietnam because it is cheaper and there are many beautiful places. But I'd love to visit Japan one day.

*How many hours a day do you watch television?*
I don't watch TV very much, maybe one hour a day. I usually watch videos on my laptop instead.

*What kinds of programmes do you like?*
I like documentaries and football matches. Documentaries help me learn new things, and football helps me relax.

*Do you prefer watching television alone or with others? Why?*
I prefer watching TV with others, especially football, because it is more exciting when we cheer together.`,
  ),
  P1(
    'p1-family',
    'Family – Home',
    [
      'How many people are there in your family?',
      'Who are you closest to in your family?',
      'Do you often spend time with your family?',
      'Do you live in a house or an apartment?',
      'What is your favourite room? Why?',
      'Would you like to change anything about your home?',
    ],
    `*How many people are there in your family?*
There are four people in my family: my parents, my younger sister and me. My parents live in Tay Ninh, and I live in Hoc Mon to study.

*Who are you closest to in your family?*
I'm closest to my mother because she always listens to me and gives me good advice.

*Do you often spend time with your family?*
Not as often as I'd like. I go back to Tay Ninh about once a month, usually at the weekend.

*Do you live in a house or an apartment?*
At the moment I rent a small room in a house in Hoc Mon District with a friend. It is cheap and quite close to my university.

*What is your favourite room? Why?*
My favourite room is my bedroom because it is quiet, and I can study and relax there.

*Would you like to change anything about your home?*
Yes, I'd like a bigger desk and better internet, because I spend a lot of time working on my laptop.`,
  ),
  P1(
    'p1-neighbourhood',
    'Neighbourhood – Weekend',
    [
      'Describe the area where you live.',
      'What do you like about your neighbourhood?',
      'Is there anything you would like to change about it?',
      'What do you usually do at weekends?',
      'What did you do last weekend?',
      'What are you going to do next weekend?',
    ],
    `*Describe the area where you live.*
I live in Hoc Mon, a suburban district in the north of Ho Chi Minh City. It is less crowded than the city centre, and there are many small markets and coffee shops.

*What do you like about your neighbourhood?*
What I like most is that it is peaceful and the cost of living is cheap. The people are also very friendly.

*Is there anything you would like to change about it?*
Yes, I'd like better roads and more buses, because there are often traffic jams on the way to the city centre in the morning.

*What do you usually do at weekends?*
At weekends I usually play badminton, clean my room and sometimes go back to Tay Ninh to see my family.

*What did you do last weekend?*
Last weekend I stayed in Hoc Mon and worked on my graduation project with my team. In the evening we had dinner together.

*What are you going to do next weekend?*
Next weekend I'm going to visit my parents in Tay Ninh because it is my mother's birthday.`,
  ),
  P1(
    'p1-reading',
    'Reading – Films',
    [
      'Do you like reading books?',
      'What kind of books do you read?',
      'Do you prefer reading e-books or paper books?',
      'Do you often watch films?',
      'What kind of films do you like?',
      'Do you prefer watching films at home or at the cinema?',
    ],
    `*Do you like reading books?*
Yes, but I don't have much time to read now. I usually read before going to bed.

*What kind of books do you read?*
I usually read self-help books and books about technology, because they help me learn useful skills.

*Do you prefer reading e-books or paper books?*
I prefer paper books to e-books because reading on a screen makes my eyes tired. But e-books are cheaper and easier to carry.

*Do you often watch films?*
Yes, I watch films about twice a week, usually at the weekend.

*What kind of films do you like?*
I really enjoy science fiction films because they are exciting and make me imagine the future.

*Do you prefer watching films at home or at the cinema?*
I prefer watching films at the cinema because the screen is big and the sound is great. However, it is more expensive, so I often watch at home.`,
  ),
  P1(
    'p1-sport',
    'Sports – Health',
    [
      'What sports do you like?',
      'Did you play any sports when you were a child?',
      'Do you prefer playing sports or watching sports?',
      'Do you think people do enough exercise nowadays?',
      'How do you relax after a stressful day?',
      'Do you get enough sleep?',
    ],
    `*What sports do you like?*
I like badminton and football. I play badminton with my friends twice a week.

*Did you play any sports when you were a child?*
Yes, when I was a child in Tay Ninh, I used to play football with my neighbours every afternoon.

*Do you prefer playing sports or watching sports?*
I prefer playing sports to watching them because it keeps me fit. But I also enjoy watching football on TV.

*Do you think people do enough exercise nowadays?*
No, I don't think so. Many people, especially office workers and students, sit in front of computers all day.

*How do you relax after a stressful day?*
I usually listen to music or go for a walk around my neighbourhood. It helps me clear my mind.

*Do you get enough sleep?*
Not really. During exams I only sleep about five hours a night, but I'm trying to sleep at least seven hours.`,
  ),
  P1(
    'p1-english',
    'Learning English – Future plans',
    [
      'How long have you been learning English?',
      'Why are you learning English?',
      'What is the most difficult part of learning English for you?',
      'What do you plan to do after graduation?',
      'Would you like to study abroad?',
      'Where would you like to live in ten years?',
    ],
    `*How long have you been learning English?*
I have been learning English for about ten years, since I was in primary school. But I only started studying seriously this year for the VSTEP exam.

*Why are you learning English?*
I'm learning English because I need a B1 certificate to graduate. Also, English is very important for IT jobs.

*What is the most difficult part of learning English for you?*
For me, speaking is the most difficult part because I don't have many chances to practise, and I'm afraid of making mistakes.

*What do you plan to do after graduation?*
After graduation, I'm planning to work as a software developer in Ho Chi Minh City. I'd like to gain experience for two or three years.

*Would you like to study abroad?*
Yes, I'd love to study abroad in Japan or Australia one day, because it would help me improve my English and learn new technologies.

*Where would you like to live in ten years?*
In ten years, I'd like to live in Ho Chi Minh City, but maybe I will buy a house near my hometown, Tay Ninh, for my parents.`,
  ),
  P1(
    'p1-transport-city',
    'City life – Environment',
    [
      'Do you prefer living in the city or in the countryside?',
      'What are the problems of living in a big city?',
      'Is there much pollution where you live?',
      'What do you do to protect the environment?',
      'Do you recycle?',
      'Should plastic bags be banned?',
    ],
    `*Do you prefer living in the city or in the countryside?*
I prefer living in the city at the moment because there are more opportunities to study and work. But I love the fresh air in the countryside of Tay Ninh.

*What are the problems of living in a big city?*
The biggest problems are traffic jams and air pollution. Also, the cost of living, especially rent, is quite high.

*Is there much pollution where you live?*
In Hoc Mon it is not too bad, but on the main roads there is a lot of dust and noise from motorbikes and trucks.

*What do you do to protect the environment?*
I try to use less plastic. For example, I bring my own water bottle to university and I say no to plastic bags.

*Do you recycle?*
Yes, a little. I keep plastic bottles and paper and give them to people who collect scrap.

*Should plastic bags be banned?*
Yes, I think they should be limited, because they take hundreds of years to break down. People can use cloth bags instead.`,
  ),

  // ======================= PART 2 =======================
  P2(
    'p2-gift',
    'Quà cho em họ học giỏi',
    'Your cousin is the best student of the year. Her parents want to give her a present. They are considering three options: a laptop, a holiday, or some money. Which option would you suggest to them?',
    ['A laptop', 'A holiday', 'Some money'],
    `In this situation, there are three options: a laptop, a holiday, or some money. In my opinion, a laptop is the best choice for the following reasons.

First of all, a laptop is very useful for studying. For example, my cousin can search for information, take online courses and practise English. As an IT student at IUH, I use my laptop every day, so I know how important it is.

Secondly, a laptop can last for many years. This means that she can use it until she goes to university.

Now let me explain why I didn't choose the other options. A holiday might be a good idea, but it only lasts a few days, and it is quite expensive. As for money, she may spend it on things she doesn't really need, so it is not as useful as a laptop.

So, that's why I think a laptop is the best option in this situation.`,
  ),
  P2(
    'p2-holiday',
    'Kỳ nghỉ một tuần của gia đình',
    'Your family has one week off. You are considering three options: going to a beach resort, exploring a new city, or staying at home to rest. Which option do you think is the best?',
    ['A beach resort', 'Exploring a new city', 'Staying at home to rest'],
    `In this situation, there are three options: going to a beach resort, exploring a new city, or staying at home to rest. In my opinion, going to a beach resort is the best choice for the following reasons.

First of all, a beach resort is perfect for relaxing. My parents work very hard in Tay Ninh, so they need a real rest. They can swim, lie on the beach and enjoy fresh seafood in Vung Tau or Nha Trang.

Secondly, a resort has activities for everyone. This means that my little sister and my parents can all have fun together.

Now let me explain why I didn't choose the other options. Exploring a new city might be interesting, but it is quite tiring because we have to walk a lot. As for staying at home, it is cheap, but it is boring and we would not have any special memories.

So, that's why I think going to a beach resort is the best option.`,
  ),
  P2(
    'p2-graduate',
    'Bạn vừa tốt nghiệp',
    "Your friend has just graduated from university. He is thinking about three options: doing a master's degree, starting work immediately, or taking a short vocational course. Which option would you recommend?",
    ["A master's degree", 'Starting work immediately', 'A short vocational course'],
    `In this situation, there are three options: doing a master's degree, starting work immediately, or taking a short vocational course. In my opinion, starting work immediately is the best choice.

First of all, working helps him gain real experience. For example, many of my friends at IUH found that they learned more in six months at a company than in one year at university.

Secondly, he can earn money and become independent. This means that he doesn't have to depend on his parents any more.

Now let me explain why I didn't choose the other options. A master's degree is useful, but it is expensive and takes two years, so he can do it later. As for a short vocational course, it may not be necessary because he already has a university degree.

So, that's why I would recommend starting work immediately.`,
  ),
  P2(
    'p2-neighbour',
    'Hàng xóm ồn ào ban đêm',
    'Your neighbour often makes a lot of noise late at night. There are three options: talking to the neighbour directly, reporting it to the building management, or ignoring it. Which option is the best?',
    ['Talk to the neighbour directly', 'Report to the building management', 'Ignore it'],
    `In this situation, there are three options: talking to the neighbour directly, reporting it to the building management, or ignoring it. In my opinion, talking to the neighbour directly is the best choice.

First of all, it is the quickest and friendliest way. Maybe my neighbour doesn't know that the noise is a problem. If I explain politely, he will probably understand.

Secondly, it keeps a good relationship. In Hoc Mon, neighbours often help each other, so I don't want to make him angry.

Now let me explain why I didn't choose the other options. Reporting to the building management might work, but it could make my neighbour feel embarrassed. As for ignoring it, I cannot sleep well, and I need to study for my exams.

So, that's why I think talking to the neighbour directly is the best option.`,
  ),
  P2(
    'p2-lottery',
    'Trúng xổ số 1 tỷ',
    'If you won a lottery of 1 billion VND, what would you do with the money? Options: buying a new house, starting a business, or depositing the money in the bank.',
    ['Buying a new house', 'Starting a business', 'Depositing the money in the bank'],
    `In this situation, there are three options: buying a new house, starting a business, or depositing the money in the bank. In my opinion, starting a business is the best choice.

First of all, a business can make more money in the long run. For example, I could open a small coffee shop near my university, because students in Go Vap and Hoc Mon love coffee.

Secondly, I would learn a lot of useful skills, such as managing money and working with customers.

Now let me explain why I didn't choose the other options. Buying a house is a good idea, but one billion dong is not enough for a house in Ho Chi Minh City. As for depositing the money in the bank, it is safe, but the interest rate is quite low.

So, that's why I think starting a business is the best option.`,
  ),
  P2(
    'p2-plastic',
    'Trường giảm rác nhựa',
    'Your school wants to reduce plastic waste. There are three suggestions: banning plastic bottles on campus, giving students free reusable water bottles, or organising a recycling competition. Which option do you think is the most effective?',
    ['Ban plastic bottles', 'Free reusable bottles', 'A recycling competition'],
    `In this situation, there are three options: banning plastic bottles, giving students free reusable bottles, or organising a recycling competition. In my opinion, giving students free reusable water bottles is the best choice.

First of all, students will use them every day. For example, at IUH there are water machines in many buildings, so students can refill their bottles easily.

Secondly, it encourages a good habit without forcing anyone. This means that students will feel happy, not angry.

Now let me explain why I didn't choose the other options. Banning plastic bottles might work, but many students would be unhappy and it is difficult to control. As for a recycling competition, it is fun, but it only lasts a short time.

So, that's why I think free reusable water bottles are the most effective option.`,
  ),
  P2(
    'p2-transport',
    'Đi lại đến trường',
    'You live 10 km from your university. You are choosing between three ways to get there every day: by motorbike, by bus, or by bicycle. Which one would you choose?',
    ['By motorbike', 'By bus', 'By bicycle'],
    `In this situation, there are three options: going by motorbike, by bus, or by bicycle. In my opinion, going by bus is the best choice for me.

First of all, it is cheap. A student monthly bus ticket in Ho Chi Minh City costs very little, so I can save money.

Secondly, it is safer and less tiring. This means that I can listen to English podcasts or review my lessons on the way from Hoc Mon to my university.

Now let me explain why I didn't choose the other options. A motorbike is faster and more flexible, but I would have to pay for petrol and parking, and the traffic is dangerous. As for a bicycle, ten kilometres is too far in the hot weather.

So, that's why I would choose to go by bus.`,
  ),
  P2(
    'p2-skill',
    'Học thêm một kỹ năng',
    'You have some free time this summer and want to learn a new skill. The options are: learning to cook, learning a musical instrument, or learning to drive. Which option is the best for you?',
    ['Cooking', 'A musical instrument', 'Driving'],
    `In this situation, there are three options: learning to cook, learning a musical instrument, or learning to drive. In my opinion, learning to cook is the best choice for me.

First of all, cooking is a life skill. Since I live alone in Hoc Mon, I need to cook healthy meals instead of eating fast food every day.

Secondly, it helps me save money. This means that I can spend less on eating out.

Now let me explain why I didn't choose the other options. Learning a musical instrument is fun, but it takes a long time to play well. As for learning to drive, it is expensive and I don't have a car yet.

So, that's why I think learning to cook is the best option.`,
  ),
  P2(
    'p2-study-place',
    'Nơi ôn thi',
    'You are preparing for an important exam. Where would you prefer to study: at home, in the university library, or at a coffee shop?',
    ['At home', 'In the university library', 'At a coffee shop'],
    `In this situation, there are three options: studying at home, in the university library, or at a coffee shop. In my opinion, the university library is the best choice.

First of all, it is quiet. Everyone is studying, so I can concentrate better. The library at IUH also has air conditioning and free wifi.

Secondly, I can find many useful books and ask my friends for help. This means that I can study more effectively.

Now let me explain why I didn't choose the other options. Studying at home is convenient, but I easily get distracted by my phone or my bed. As for a coffee shop, it is often noisy and I have to buy drinks.

So, that's why I think the university library is the best place to study.`,
  ),
  P2(
    'p2-birthday',
    'Tổ chức sinh nhật bạn thân',
    'You want to organise a birthday party for your best friend. You are considering three options: a party at a restaurant, a party at home, or a short trip together. Which option would you choose?',
    ['A party at a restaurant', 'A party at home', 'A short trip together'],
    `In this situation, there are three options: a party at a restaurant, a party at home, or a short trip together. In my opinion, a short trip together is the best choice.

First of all, a trip creates special memories. For example, we could go to Tay Ninh for a weekend, climb Ba Den Mountain and try the local food.

Secondly, my friend loves travelling, so he would be very happy.

Now let me explain why I didn't choose the other options. A party at a restaurant is convenient, but it is expensive and not very personal. As for a party at home, it is cheap, but we would have to cook and clean a lot.

So, that's why I would choose a short trip together.`,
  ),
  P2(
    'p2-job',
    'Chọn việc làm thêm',
    'You want a part-time job while studying. The options are: working as a waiter in a restaurant, tutoring high school students, or doing freelance IT work online. Which job would you choose?',
    ['Waiter', 'Tutor', 'Freelance IT work'],
    `In this situation, there are three options: working as a waiter, tutoring high school students, or doing freelance IT work online. In my opinion, freelance IT work is the best choice for me.

First of all, it is related to my major. As an IT student at IUH, I can practise programming and build my portfolio.

Secondly, I can work from home at any time. This means that I can still focus on my studies and my graduation project.

Now let me explain why I didn't choose the other options. Working as a waiter is a good experience, but the salary is low and it is tiring. As for tutoring, it pays well, but I have to travel to students' houses.

So, that's why I would choose freelance IT work.`,
  ),
  P2(
    'p2-phone',
    'Điện thoại cho bố mẹ',
    'Your parents want a new way to keep in touch with you while you study far from home. Options: weekly video calls, a family group chat, or visiting home every month. Which is the best?',
    ['Weekly video calls', 'A family group chat', 'Visiting home every month'],
    `In this situation, there are three options: weekly video calls, a family group chat, or visiting home every month. In my opinion, weekly video calls are the best choice.

First of all, my parents can see my face and know that I am healthy. My mother always worries about me because I live alone in Hoc Mon.

Secondly, video calls are free and easy with Zalo. This means that we can talk for a long time without spending money.

Now let me explain why I didn't choose the other options. A group chat is convenient, but text messages are not as warm as talking. As for visiting home every month, Tay Ninh is not too far, but it takes time and money, and I am very busy this year.

So, that's why I think weekly video calls are the best option.`,
  ),

  // ======================= PART 3 =======================
  P3(
    'p3-exercise',
    'Regular exercise plays an important role in a healthy lifestyle',
    ['Physical health', 'Mental health and stress relief', 'More energy and better sleep'],
    ["Why don't many people exercise regularly?", 'What sports are popular in Vietnam?'],
    `I'd like to talk about the importance of regular exercise. In my opinion, exercise is one of the best ways to live a healthy life. There are three main benefits: it improves our physical health, it is good for our mental health, and it gives us more energy and better sleep.

Firstly, exercise makes our body stronger. This is because when we move, our heart and muscles work harder. For example, since I started playing badminton twice a week, I rarely catch a cold.

Secondly, exercise is good for our mind. When we play sports, we can forget our problems for a while. As a result, we feel less stressed. This is really helpful for me in my final year at IUH.

Finally, people who exercise regularly usually sleep better. For instance, after playing badminton in the evening, I fall asleep very quickly.

In conclusion, regular exercise brings many benefits to both our body and mind. That's all I want to say. Thank you for listening.

*Follow-up: Why don't many people exercise regularly?*
That's a good question. I think the main reason is that people are too busy with work and study. For example, many of my classmates spend all day in front of their computers.`,
  ),
  P3(
    'p3-pairs',
    'Working in pairs helps students learn better at school',
    ['Learn from each other', 'More active in class', 'Communication and cooperation skills'],
    ['Do you prefer working alone or in a group?', 'What problems can happen when students work together?'],
    `I'd like to talk about working in pairs at school. In my opinion, it really helps students learn better. There are three main reasons: students can learn from each other, they become more active, and they develop communication skills.

Firstly, when students work in pairs, they can share knowledge. For example, in my programming class, my partner is good at design and I am good at coding, so we help each other.

Secondly, pair work makes students more active. In a big class, some students never speak, but in pairs everyone has to take part.

Finally, students learn how to communicate and cooperate. These skills are very important for future jobs, especially in IT companies where people always work in teams.

In conclusion, working in pairs brings many benefits for students. Thank you for listening.`,
  ),
  P3(
    'p3-tech',
    'Using technology in the classroom helps students learn more effectively',
    ['Quick access to information', 'Interactive lessons', 'More participation'],
    ['Are there any disadvantages of technology in class?', 'Will computers replace teachers in the future?'],
    `I'd like to talk about using technology in the classroom. In my opinion, technology helps students learn more effectively. There are three main reasons: quick access to information, interactive lessons, and more participation.

Firstly, students can find information very quickly on the internet. For example, at IUH we often look up documents during class to understand new concepts.

Secondly, lessons become more interesting with videos, slides and online quizzes. As a result, students remember the lessons longer.

Finally, technology encourages shy students to take part. They can answer questions on apps like Kahoot without feeling nervous.

Besides these points, I think technology also prepares students for their future jobs. In conclusion, technology is a useful tool in education. Thank you for listening.

*Follow-up: Will computers replace teachers in the future?*
I don't think so. Computers can give information, but teachers can motivate students and understand their feelings.`,
  ),
  P3(
    'p3-socialmedia',
    "Social media has a strong influence on people's daily lives",
    ['Communication across distance', 'Fast information sharing', 'Addiction and less face-to-face contact'],
    ['How much time do you spend on social media?', 'Should children under 13 use social media?'],
    `I'd like to talk about the influence of social media. In my opinion, social media affects our lives in both good and bad ways. There are three main points: it helps us communicate, it spreads information quickly, but it can also be addictive.

Firstly, social media helps people keep in touch over long distances. For example, I use Zalo every day to talk to my parents in Tay Ninh.

Secondly, information is shared very fast. News, job advertisements and study materials appear on Facebook within minutes.

However, social media can be addictive. Many young people spend hours scrolling TikTok, so they have less time to talk to people face to face.

In conclusion, social media is useful, but we should use it wisely. Thank you for listening.`,
  ),
  P3(
    'p3-extra',
    'Students should be encouraged to take part in extracurricular activities',
    ['Relieve stress', 'Teamwork and communication', 'Discover interests and talents'],
    ['What extracurricular activities did you join?', "Can these activities affect students' studies?"],
    `I'd like to talk about extracurricular activities. In my opinion, students should be encouraged to join them. There are three main benefits: they relieve stress, they build teamwork skills, and they help students discover their talents.

Firstly, after hours of studying, activities like sports or music help students relax.

Secondly, students learn to work in teams. For example, when I joined the IT club at IUH, I worked with other students to organise a programming contest.

Finally, students can discover new interests. Some of my friends found that they love photography after joining a club.

In conclusion, extracurricular activities are very good for students. Thank you for listening.`,
  ),
  P3(
    'p3-time',
    'Students should learn how to manage their time effectively',
    ['Better study planning', 'Less stress', 'Balance between study and personal life'],
    ['How do you manage your time?', 'Why do many students leave work until the last minute?'],
    `I'd like to talk about time management. In my opinion, it is one of the most important skills for students. There are three main reasons: it helps students plan their studies, reduces stress, and balances study and personal life.

Firstly, with a good plan, students know what to do every day. For example, I use a calendar app to plan my VSTEP study and my graduation project.

Secondly, good time management reduces stress, because students don't have to study all night before exams.

Finally, students have time for family, friends and hobbies. As a result, they feel happier.

In conclusion, time management helps students succeed. Thank you for listening.`,
  ),
  P3(
    'p3-balance',
    'Work-life balance is important for people who work full-time',
    ['Rest and less stress', 'Time for family', 'Motivation at work'],
    ['Is it difficult to have a work-life balance in Vietnam?', 'What can companies do to help their employees?'],
    `I'd like to talk about work-life balance. In my opinion, it is very important for full-time workers. There are three main reasons: people need rest, they need time for family, and balance keeps them motivated.

Firstly, if people work too much, they become tired and stressed, and this can affect their health.

Secondly, people need time for their families. For example, my father works in Tay Ninh, but he always has dinner with my family every evening.

Finally, when workers have enough rest, they come back to work with more energy and new ideas.

In conclusion, a good work-life balance is good for both workers and companies. Thank you for listening.`,
  ),
  P3(
    'p3-transport',
    'Public transportation should be improved in big cities',
    ['Less traffic congestion', 'Less pollution', 'Convenient and affordable'],
    ['Do you often use public transport?', 'Should private cars be banned in city centres?'],
    `I'd like to talk about public transport in big cities like Ho Chi Minh City. In my opinion, it should be improved. There are three main reasons: it reduces traffic jams, it reduces pollution, and it is cheap and convenient.

Firstly, if more people take buses or the metro, there will be fewer motorbikes on the roads. Every morning on the way from Hoc Mon to the city centre, I see terrible traffic jams.

Secondly, public transport produces less air pollution than millions of motorbikes.

Finally, it is affordable for students and workers. With better buses and more metro lines, people would save time and money.

In conclusion, the government should invest more in public transport. Thank you for listening.`,
  ),
  P3(
    'p3-env',
    'People should do more to protect the environment',
    ['Reduce pollution', 'Save natural resources', 'A cleaner living environment'],
    ['What do you do to protect the environment?', 'Who is more responsible: governments or individuals?'],
    `I'd like to talk about protecting the environment. In my opinion, everyone should do more. There are three main reasons: to reduce pollution, to save natural resources, and to have a cleaner place to live.

Firstly, small actions can reduce pollution. For example, I bring my own bottle to university and avoid plastic bags.

Secondly, we need to save resources such as water and electricity for future generations.

Finally, a clean environment is better for our health. When I go back to Tay Ninh, I always notice how fresh the air is compared to the city.

In conclusion, protecting the environment is everyone's responsibility. Thank you for listening.`,
  ),
  P3(
    'p3-reading',
    'Discuss the importance of reading books',
    ['Open knowledge', 'Improve critical thinking', 'Entertainment'],
    ['Do young people read less than before?', 'Do you prefer e-books or paper books?'],
    `I'd like to talk about the importance of reading books. In my opinion, reading is very useful. There are three main benefits: it opens our knowledge, improves critical thinking, and entertains us.

Firstly, books give us knowledge about many topics. For example, I read books about software design to help with my graduation project.

Secondly, reading helps us think more deeply, because we have to understand and judge the writer's ideas.

Finally, reading is a great way to relax. After a long day, a good novel helps me forget my stress.

In conclusion, everyone should read more books. Thank you for listening.`,
  ),
  P3(
    'p3-online',
    'Online learning has become popular among students',
    ['Flexible time and place', 'Lower cost', 'Lack of interaction'],
    ['Have you ever taken an online course?', 'Will online learning replace traditional classes?'],
    `I'd like to talk about online learning. In my opinion, it has both advantages and disadvantages. There are three main points: it is flexible, it is cheaper, but it lacks interaction.

Firstly, students can study anytime and anywhere. During the Covid-19 pandemic, I studied online at home in Tay Ninh for almost a year.

Secondly, online courses are often cheaper, and students don't need to pay for transport.

However, online learning lacks face-to-face interaction. It is harder to ask teachers questions and to stay motivated.

In conclusion, online learning is useful, but it should be combined with traditional classes. Thank you for listening.`,
  ),
  P3(
    'p3-hometown-tourism',
    'Tourism brings benefits to local areas',
    ['Jobs for local people', 'Better infrastructure', 'Promoting local culture'],
    ['What are the negative effects of tourism?', 'What should tourists do to respect local culture?'],
    `I'd like to talk about the benefits of tourism. In my opinion, tourism brings many advantages to local areas. There are three main benefits: it creates jobs, improves infrastructure, and promotes local culture.

Firstly, tourism creates jobs. For example, in my hometown Tay Ninh, many people work in hotels, restaurants and the cable car at Ba Den Mountain.

Secondly, the government builds better roads and services for tourists, and local people can use them too.

Finally, tourism helps introduce local culture and food, such as banh canh Trang Bang and rice paper, to people from other places.

In conclusion, tourism is very good for local areas if it is managed well. Thank you for listening.`,
  ),
  P3(
    'p3-english',
    'Learning English is important for young people',
    ['Better job opportunities', 'Access to knowledge', 'Communicating with people from other countries'],
    ['At what age should children start learning English?', 'What is the best way to learn English?'],
    `I'd like to talk about the importance of learning English. In my opinion, English is essential for young people. There are three main reasons: better jobs, access to knowledge, and international communication.

Firstly, many companies require English. For example, most IT companies in Ho Chi Minh City ask for English skills in their job advertisements.

Secondly, most documents and online courses are in English. As an IT student, I read English documents every day.

Finally, English helps us talk to people from all over the world and understand other cultures.

In conclusion, learning English opens many doors for young people. Thank you for listening.`,
  ),
  P3(
    'p3-cities',
    'More and more young people move to big cities',
    ['Job opportunities', 'Better education', 'Modern lifestyle'],
    ['What problems does this cause for big cities?', 'Would you like to go back to your hometown?'],
    `I'd like to talk about why young people move to big cities. In my opinion, there are three main reasons: jobs, education, and a modern lifestyle.

Firstly, big cities have more job opportunities and higher salaries. That's why I moved from Tay Ninh to Ho Chi Minh City.

Secondly, the best universities are in big cities. For example, I study at the Industrial University of Ho Chi Minh City.

Finally, young people enjoy the modern lifestyle, with shopping malls, cafés and entertainment.

However, this trend also causes problems such as traffic jams and high rent. In conclusion, big cities attract young people, but the government should also develop smaller towns. Thank you for listening.`,
  ),
];
