import { md, type VDoc } from './types';
import { VOCAB_DAILY, VOCAB_MORE } from './vocab-extra';

const topic = (id: string, title: string, rows: string, tip = '') => ({
  id,
  title,
  body:
    md`
    ~~~vocab ${title}
    ${(rows + (VOCAB_MORE[id] ?? ''))
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .join('\n    ')}
    ~~~
  ` + (tip ? '\n' + tip : ''),
});

export const vocabDoc: VDoc = {
  id: 'vocab',
  title: 'Từ vựng theo chủ đề',
  subtitle: '12 chủ đề (~20 từ mỗi chủ đề) + câu nói hằng ngày, có phiên âm và câu ví dụ',
  parts: [
    {
      id: 'v1',
      title: 'Phần 1. Đời sống cá nhân',
      sections: [
        topic(
          'v-family',
          '1. Gia đình và bạn bè',
          `
          relative | /ˈrelətɪv/ | n | họ hàng | I visit my relatives during Tet. | Tôi thăm họ hàng dịp Tết.
          get on well with | | phr | hoà thuận với | I get on well with my brother. | Tôi hoà thuận với anh trai.
          close friend | /kləʊs frend/ | n | bạn thân | She is my close friend. | Cô ấy là bạn thân của tôi.
          support | /səˈpɔːt/ | v | ủng hộ, hỗ trợ | My parents always support me. | Bố mẹ luôn ủng hộ tôi.
          generation | /ˌdʒenəˈreɪʃn/ | n | thế hệ | Three generations live together. | Ba thế hệ sống cùng nhau.
          reliable | /rɪˈlaɪəbl/ | adj | đáng tin cậy | A good friend is reliable. | Một người bạn tốt đáng tin cậy.
          spend quality time | | phr | dành thời gian chất lượng | We spend quality time together at weekends. | Cuối tuần chúng tôi dành thời gian bên nhau.
          argue | /ˈɑːɡjuː/ | v | cãi nhau | We sometimes argue about small things. | Đôi khi chúng tôi cãi nhau vì chuyện nhỏ.
          `,
        ),
        topic(
          'v-home',
          '2. Quê hương và nhà ở',
          `
          hometown | /ˈhəʊmtaʊn/ | n | quê hương | My hometown is famous for its beaches. | Quê tôi nổi tiếng với các bãi biển.
          peaceful | /ˈpiːsfl/ | adj | yên bình | The countryside is peaceful. | Nông thôn yên bình.
          crowded | /ˈkraʊdɪd/ | adj | đông đúc | Ha Noi is very crowded. | Hà Nội rất đông đúc.
          neighbour | /ˈneɪbə/ | n | hàng xóm | My neighbours are friendly. | Hàng xóm tôi thân thiện.
          apartment | /əˈpɑːtmənt/ | n | căn hộ | I live in a small apartment. | Tôi sống trong một căn hộ nhỏ.
          rent | /rent/ | v, n | thuê; tiền thuê | The rent is quite high. | Tiền thuê khá cao.
          convenient | /kənˈviːniənt/ | adj | thuận tiện | It is convenient to live near the city centre. | Sống gần trung tâm rất tiện.
          landmark | /ˈlændmɑːk/ | n | địa danh nổi bật | The Old Quarter is a famous landmark. | Phố cổ là địa danh nổi tiếng.
          `,
        ),
        topic(
          'v-food',
          '3. Ăn uống',
          `
          delicious | /dɪˈlɪʃəs/ | adj | ngon | Pho is delicious. | Phở rất ngon.
          ingredient | /ɪnˈɡriːdiənt/ | n | nguyên liệu | The main ingredients are rice and pork. | Nguyên liệu chính là gạo và thịt lợn.
          spicy | /ˈspaɪsi/ | adj | cay | I don't like spicy food. | Tôi không thích đồ cay.
          eat out | /iːt aʊt/ | phr v | ăn ngoài | We eat out once a week. | Chúng tôi ăn ngoài mỗi tuần một lần.
          healthy diet | /ˈhelθi ˈdaɪət/ | n | chế độ ăn lành mạnh | A healthy diet includes lots of vegetables. | Chế độ ăn lành mạnh có nhiều rau.
          fast food | /fɑːst fuːd/ | n | đồ ăn nhanh | Fast food is cheap but unhealthy. | Đồ ăn nhanh rẻ nhưng không tốt.
          traditional dish | /trəˈdɪʃənl dɪʃ/ | n | món truyền thống | Banh chung is a traditional dish at Tet. | Bánh chưng là món truyền thống ngày Tết.
          recipe | /ˈresəpi/ | n | công thức nấu ăn | My mum taught me this recipe. | Mẹ dạy tôi công thức này.
          `,
        ),
        topic(
          'v-hobby',
          '4. Giải trí và sở thích',
          `
          hobby | /ˈhɒbi/ | n | sở thích | My hobby is playing badminton. | Sở thích của tôi là chơi cầu lông.
          free time | /friː taɪm/ | n | thời gian rảnh | In my free time, I read books. | Lúc rảnh tôi đọc sách.
          relaxing | /rɪˈlæksɪŋ/ | adj | thư giãn | Listening to music is relaxing. | Nghe nhạc rất thư giãn.
          documentary | /ˌdɒkjuˈmentri/ | n | phim tài liệu | I like watching documentaries about animals. | Tôi thích xem phim tài liệu về động vật.
          go jogging | /ɡəʊ ˈdʒɒɡɪŋ/ | phr | chạy bộ | I go jogging every morning. | Tôi chạy bộ mỗi sáng.
          entertaining | /ˌentəˈteɪnɪŋ/ | adj | mang tính giải trí | The show is very entertaining. | Chương trình rất giải trí.
          concert | /ˈkɒnsət/ | n | buổi hoà nhạc | I went to a concert last month. | Tháng trước tôi đi xem hoà nhạc.
          collect | /kəˈlekt/ | v | sưu tầm | He collects old coins. | Anh ấy sưu tầm tiền xu cổ.
          `,
        ),
      ],
    },
    {
      id: 'v2',
      title: 'Phần 2. Học tập và công việc',
      sections: [
        topic(
          'v-edu',
          '5. Giáo dục',
          `
          subject | /ˈsʌbdʒɪkt/ | n | môn học | My favourite subject is history. | Môn yêu thích của tôi là lịch sử.
          tuition fee | /tjuˈɪʃn fiː/ | n | học phí | Tuition fees are increasing. | Học phí đang tăng.
          graduate | /ˈɡrædʒueɪt/ | v | tốt nghiệp | I will graduate next year. | Năm sau tôi sẽ tốt nghiệp.
          knowledge | /ˈnɒlɪdʒ/ | n | kiến thức | Reading improves our knowledge. | Đọc sách nâng cao kiến thức.
          skill | /skɪl/ | n | kỹ năng | Communication skills are important. | Kỹ năng giao tiếp rất quan trọng.
          extracurricular activity | /ˌekstrəkəˈrɪkjələr ækˈtɪvəti/ | n | hoạt động ngoại khoá | I join many extracurricular activities. | Tôi tham gia nhiều hoạt động ngoại khoá.
          pressure | /ˈpreʃə/ | n | áp lực | Students face a lot of exam pressure. | Học sinh chịu nhiều áp lực thi cử.
          vocational training | /vəʊˈkeɪʃənl ˈtreɪnɪŋ/ | n | đào tạo nghề | Vocational training helps people find jobs quickly. | Học nghề giúp có việc nhanh.
          `,
        ),
        topic(
          'v-work',
          '6. Công việc và nghề nghiệp',
          `
          career | /kəˈrɪə/ | n | sự nghiệp | I want a career in IT. | Tôi muốn theo nghề công nghệ thông tin.
          experience | /ɪkˈspɪəriəns/ | n | kinh nghiệm | This job requires experience. | Công việc này cần kinh nghiệm.
          apply for | /əˈplaɪ fə/ | phr v | ứng tuyển | I applied for a job at a bank. | Tôi đã ứng tuyển vào một ngân hàng.
          well-paid | /ˌwel ˈpeɪd/ | adj | lương cao | Doctors have well-paid jobs. | Bác sĩ có công việc lương cao.
          job satisfaction | /dʒɒb ˌsætɪsˈfækʃn/ | n | sự hài lòng với công việc | Job satisfaction is more important than money. | Yêu thích công việc quan trọng hơn tiền.
          work from home | | phr | làm việc tại nhà | Many people work from home now. | Giờ nhiều người làm việc tại nhà.
          deadline | /ˈdedlaɪn/ | n | hạn chót | I have to meet a deadline. | Tôi phải kịp hạn chót.
          teamwork | /ˈtiːmwɜːk/ | n | làm việc nhóm | Teamwork helps us finish tasks faster. | Làm việc nhóm giúp xong việc nhanh hơn.
          `,
        ),
        topic(
          'v-tech',
          '7. Công nghệ và mạng xã hội',
          `
          device | /dɪˈvaɪs/ | n | thiết bị | Smartphones are useful devices. | Điện thoại thông minh là thiết bị hữu ích.
          social media | /ˌsəʊʃl ˈmiːdiə/ | n | mạng xã hội | Young people spend hours on social media. | Giới trẻ dành hàng giờ trên mạng xã hội.
          addicted to | /əˈdɪktɪd tə/ | adj | nghiện | Many teenagers are addicted to games. | Nhiều thiếu niên nghiện game.
          access | /ˈækses/ | v, n | truy cập | We can access information easily. | Chúng ta truy cập thông tin dễ dàng.
          online | /ˌɒnˈlaɪn/ | adj, adv | trực tuyến | I often shop online. | Tôi hay mua sắm trực tuyến.
          privacy | /ˈprɪvəsi/ | n | quyền riêng tư | Social media can affect our privacy. | Mạng xã hội có thể ảnh hưởng quyền riêng tư.
          artificial intelligence | /ˌɑːtɪfɪʃl ɪnˈtelɪdʒəns/ | n | trí tuệ nhân tạo | AI is changing the way we work. | AI đang thay đổi cách chúng ta làm việc.
          screen time | /skriːn taɪm/ | n | thời gian dùng màn hình | Children should limit their screen time. | Trẻ em nên hạn chế thời gian dùng màn hình.
          `,
        ),
        topic(
          'v-money',
          '8. Mua sắm và tiền bạc',
          `
          discount | /ˈdɪskaʊnt/ | n | giảm giá | There is a 20% discount today. | Hôm nay giảm giá 20%.
          afford | /əˈfɔːd/ | v | đủ khả năng chi trả | I can't afford a new car. | Tôi không đủ tiền mua xe mới.
          save money | /seɪv ˈmʌni/ | phr | tiết kiệm tiền | I'm trying to save money. | Tôi đang cố tiết kiệm tiền.
          customer | /ˈkʌstəmə/ | n | khách hàng | The customer asked for a refund. | Khách hàng yêu cầu hoàn tiền.
          quality | /ˈkwɒləti/ | n | chất lượng | The quality is very good. | Chất lượng rất tốt.
          bargain | /ˈbɑːɡən/ | n | món hời | This jacket was a real bargain. | Chiếc áo khoác này thật là món hời.
          budget | /ˈbʌdʒɪt/ | n | ngân sách | We have a small budget for the trip. | Chúng tôi có ngân sách nhỏ cho chuyến đi.
          `,
        ),
      ],
    },
    {
      id: 'v3',
      title: 'Phần 3. Xã hội và môi trường',
      sections: [
        topic(
          'v-health',
          '9. Sức khoẻ và lối sống',
          `
          healthy lifestyle | /ˈhelθi ˈlaɪfstaɪl/ | n | lối sống lành mạnh | Exercise is part of a healthy lifestyle. | Tập thể dục là một phần của lối sống lành mạnh.
          stress | /stres/ | n | căng thẳng | Too much work causes stress. | Quá nhiều việc gây căng thẳng.
          obesity | /əʊˈbiːsəti/ | n | béo phì | Obesity is a serious problem. | Béo phì là vấn đề nghiêm trọng.
          work out | /wɜːk aʊt/ | phr v | tập thể dục | I work out at the gym. | Tôi tập ở phòng gym.
          get enough sleep | | phr | ngủ đủ giấc | Students should get enough sleep. | Học sinh nên ngủ đủ giấc.
          mental health | /ˈmentl helθ/ | n | sức khoẻ tinh thần | Mental health is as important as physical health. | Sức khoẻ tinh thần quan trọng như thể chất.
          balanced | /ˈbælənst/ | adj | cân bằng | Eat a balanced diet. | Ăn uống cân bằng.
          `,
        ),
        topic(
          'v-env',
          '10. Môi trường',
          `
          environment | /ɪnˈvaɪrənmənt/ | n | môi trường | We must protect the environment. | Chúng ta phải bảo vệ môi trường.
          pollution | /pəˈluːʃn/ | n | ô nhiễm | Air pollution is getting worse. | Ô nhiễm không khí ngày càng tệ.
          climate change | /ˈklaɪmət tʃeɪndʒ/ | n | biến đổi khí hậu | Climate change causes floods. | Biến đổi khí hậu gây lũ lụt.
          plastic waste | /ˈplæstɪk weɪst/ | n | rác thải nhựa | Plastic waste harms sea animals. | Rác nhựa gây hại cho sinh vật biển.
          recycle | /ˌriːˈsaɪkl/ | v | tái chế | We should recycle paper and bottles. | Chúng ta nên tái chế giấy và chai lọ.
          renewable energy | /rɪˈnjuːəbl ˈenədʒi/ | n | năng lượng tái tạo | Solar power is renewable energy. | Điện mặt trời là năng lượng tái tạo.
          raise awareness | /reɪz əˈweənəs/ | phr | nâng cao nhận thức | Schools should raise awareness about the environment. | Trường học nên nâng cao nhận thức về môi trường.
          `,
        ),
        topic(
          'v-travel',
          '11. Du lịch',
          `
          destination | /ˌdestɪˈneɪʃn/ | n | điểm đến | Ha Long Bay is a popular destination. | Vịnh Hạ Long là điểm đến nổi tiếng.
          sightseeing | /ˈsaɪtsiːɪŋ/ | n | tham quan | We went sightseeing in Hue. | Chúng tôi đi tham quan Huế.
          book | /bʊk/ | v | đặt (chỗ) | I booked a hotel online. | Tôi đặt khách sạn qua mạng.
          souvenir | /ˌsuːvəˈnɪə/ | n | quà lưu niệm | I bought some souvenirs for my friends. | Tôi mua quà lưu niệm cho bạn.
          scenery | /ˈsiːnəri/ | n | phong cảnh | The scenery in Sa Pa is amazing. | Phong cảnh Sa Pa tuyệt đẹp.
          local culture | /ˈləʊkl ˈkʌltʃə/ | n | văn hoá địa phương | Travelling helps us learn about local culture. | Du lịch giúp tìm hiểu văn hoá địa phương.
          package tour | /ˈpækɪdʒ tʊə/ | n | tour trọn gói | A package tour is convenient. | Tour trọn gói rất tiện.
          `,
        ),
        topic(
          'v-transport',
          '12. Giao thông và đô thị',
          `
          traffic jam | /ˈtræfɪk dʒæm/ | n | tắc đường | There are traffic jams every morning. | Sáng nào cũng tắc đường.
          public transport | /ˌpʌblɪk ˈtrænspɔːt/ | n | phương tiện công cộng | Public transport is cheap. | Phương tiện công cộng rẻ.
          commute | /kəˈmjuːt/ | v | đi lại (đi làm/đi học) | I commute by bus. | Tôi đi làm bằng xe buýt.
          rush hour | /rʌʃ ˈaʊə/ | n | giờ cao điểm | Avoid driving during rush hour. | Tránh lái xe giờ cao điểm.
          infrastructure | /ˈɪnfrəstrʌktʃə/ | n | cơ sở hạ tầng | The city needs better infrastructure. | Thành phố cần hạ tầng tốt hơn.
          pedestrian | /pəˈdestriən/ | n | người đi bộ | The street is only for pedestrians. | Phố chỉ dành cho người đi bộ.
          metro | /ˈmetrəʊ/ | n | tàu điện ngầm/đô thị | Ha Noi now has a metro line. | Hà Nội giờ có tuyến tàu điện.
          `,
        ),
      ],
    },
    VOCAB_DAILY,
  ],
};
