// Từ vựng mở rộng cho 12 chủ đề + phần câu nói hằng ngày theo tình huống.
import { md, type DocPart } from './types';

/** Dòng từ vựng thêm (cùng định dạng khối ~~~vocab) theo id mục. */
export const VOCAB_MORE: Record<string, string> = {
  'v-family': `
    sibling | /ˈsɪblɪŋ/ | n | anh chị em ruột | I have one sibling, a younger sister. | Tôi có một người em gái.
    only child | /ˈəʊnli tʃaɪld/ | n | con một | My best friend is an only child. | Bạn thân tôi là con một.
    look after | /lʊk ˈɑːftə/ | phr v | chăm sóc | My grandmother looked after me when I was small. | Bà chăm sóc tôi hồi nhỏ.
    take after | /teɪk ˈɑːftə/ | phr v | giống (người lớn trong nhà) | I take after my father. | Tôi giống bố.
    bring up | /brɪŋ ʌp/ | phr v | nuôi dạy | I was brought up in Tay Ninh. | Tôi lớn lên ở Tây Ninh.
    extended family | /ɪkˌstendɪd ˈfæməli/ | n | đại gia đình | We have a big extended family. | Nhà tôi có đại gia đình lớn.
    nuclear family | /ˌnjuːkliə ˈfæməli/ | n | gia đình hạt nhân | Nuclear families are common in cities. | Gia đình hạt nhân phổ biến ở thành phố.
    trust | /trʌst/ | v, n | tin tưởng | I trust my best friend completely. | Tôi hoàn toàn tin bạn thân.
    in common | /ɪn ˈkɒmən/ | phr | điểm chung | We have a lot in common. | Chúng tôi có nhiều điểm chung.
    fall out with | /fɔːl aʊt wɪð/ | phr v | bất hoà với | I rarely fall out with my friends. | Tôi hiếm khi bất hoà với bạn.
    keep in touch | /kiːp ɪn tʌtʃ/ | phr | giữ liên lạc | I keep in touch with my old classmates. | Tôi giữ liên lạc với bạn cũ.
    reunion | /riːˈjuːniən/ | n | buổi họp mặt | We have a family reunion at Tet. | Nhà tôi họp mặt dịp Tết.
  `,
  'v-home': `
    suburb | /ˈsʌbɜːb/ | n | ngoại ô | Hoc Mon is a suburb of Ho Chi Minh City. | Hóc Môn là vùng ngoại ô TP.HCM.
    rural | /ˈrʊərəl/ | adj | thuộc nông thôn | I grew up in a rural area. | Tôi lớn lên ở nông thôn.
    urban | /ˈɜːbən/ | adj | thuộc đô thị | Urban life is fast. | Cuộc sống đô thị nhanh.
    cost of living | /kɒst əv ˈlɪvɪŋ/ | n | chi phí sinh hoạt | The cost of living is high in the city. | Chi phí sinh hoạt ở thành phố cao.
    landlord | /ˈlændlɔːd/ | n | chủ nhà (cho thuê) | My landlord is very kind. | Chủ nhà tôi rất tốt.
    roommate | /ˈruːmmeɪt/ | n | bạn cùng phòng | I share a room with a roommate. | Tôi ở chung với một bạn.
    spacious | /ˈspeɪʃəs/ | adj | rộng rãi | My parents' house is spacious. | Nhà bố mẹ tôi rộng rãi.
    cosy | /ˈkəʊzi/ | adj | ấm cúng | My room is small but cosy. | Phòng tôi nhỏ nhưng ấm cúng.
    noisy | /ˈnɔɪzi/ | adj | ồn ào | The main road is very noisy. | Đường lớn rất ồn.
    facilities | /fəˈsɪlətiz/ | n | tiện ích | The area has good facilities. | Khu vực có tiện ích tốt.
    move out | /muːv aʊt/ | phr v | dọn đi | I'll move out next month. | Tháng sau tôi dọn đi.
    famous for | /ˈfeɪməs fə/ | phr | nổi tiếng về | Tay Ninh is famous for Ba Den Mountain. | Tây Ninh nổi tiếng với núi Bà Đen.
  `,
  'v-food': `
    tasty | /ˈteɪsti/ | adj | ngon | The soup is very tasty. | Món canh rất ngon.
    sour | /ˈsaʊə/ | adj | chua | Vietnamese sour soup is delicious. | Canh chua Việt Nam rất ngon.
    salty | /ˈsɔːlti/ | adj | mặn | This dish is a bit salty. | Món này hơi mặn.
    street food | /ˈstriːt fuːd/ | n | đồ ăn đường phố | Ho Chi Minh City is famous for street food. | TP.HCM nổi tiếng đồ ăn đường phố.
    vegetarian | /ˌvedʒəˈteəriən/ | n, adj | người ăn chay; chay | My mother is a vegetarian. | Mẹ tôi ăn chay.
    junk food | /ˈdʒʌŋk fuːd/ | n | đồ ăn vặt không tốt | I try to avoid junk food. | Tôi cố tránh đồ ăn vặt.
    home-cooked | /ˌhəʊm ˈkʊkt/ | adj | nấu ở nhà | I prefer home-cooked meals. | Tôi thích cơm nhà nấu.
    skip a meal | /skɪp ə miːl/ | phr | bỏ bữa | I often skip breakfast. | Tôi hay bỏ bữa sáng.
    nutritious | /njuˈtrɪʃəs/ | adj | bổ dưỡng | Vegetables are nutritious. | Rau rất bổ dưỡng.
    portion | /ˈpɔːʃn/ | n | khẩu phần | The portions here are big. | Khẩu phần ở đây lớn.
    rice paper | /ˈraɪs peɪpə/ | n | bánh tráng | Tay Ninh is famous for rice paper. | Tây Ninh nổi tiếng bánh tráng.
    flavour | /ˈfleɪvə/ | n | hương vị | It has a unique flavour. | Nó có hương vị đặc biệt.
  `,
  'v-hobby': `
    pastime | /ˈpɑːstaɪm/ | n | trò tiêu khiển | Reading is my favourite pastime. | Đọc sách là thú tiêu khiển yêu thích.
    take up | /teɪk ʌp/ | phr v | bắt đầu (sở thích) | I took up badminton three years ago. | Tôi bắt đầu chơi cầu lông 3 năm trước.
    be keen on | /biː ˈkiːn ɒn/ | phr | rất thích | I'm keen on photography. | Tôi rất thích chụp ảnh.
    be into | /biː ˈɪntuː/ | phr | mê | I'm really into Korean dramas. | Tôi mê phim Hàn.
    hang out | /hæŋ aʊt/ | phr v | đi chơi | I hang out with my friends at weekends. | Cuối tuần tôi đi chơi với bạn.
    unwind | /ʌnˈwaɪnd/ | v | thư giãn | Music helps me unwind. | Nhạc giúp tôi thư giãn.
    exhibition | /ˌeksɪˈbɪʃn/ | n | triển lãm | I went to an art exhibition. | Tôi đi xem triển lãm tranh.
    novel | /ˈnɒvl/ | n | tiểu thuyết | I'm reading a novel. | Tôi đang đọc tiểu thuyết.
    gardening | /ˈɡɑːdnɪŋ/ | n | làm vườn | My father loves gardening. | Bố tôi thích làm vườn.
    instrument | /ˈɪnstrəmənt/ | n | nhạc cụ | I'd like to learn an instrument. | Tôi muốn học một nhạc cụ.
    creative | /kriˈeɪtɪv/ | adj | sáng tạo | Drawing makes me creative. | Vẽ giúp tôi sáng tạo.
    spare time | /speə taɪm/ | n | thời gian rảnh | What do you do in your spare time? | Lúc rảnh bạn làm gì?
  `,
  'v-edu': `
    major | /ˈmeɪdʒə/ | n | chuyên ngành | My major is Information Technology. | Chuyên ngành của tôi là CNTT.
    semester | /sɪˈmestə/ | n | học kỳ | This semester is very busy. | Học kỳ này rất bận.
    graduation project | /ˌɡrædʒuˈeɪʃn ˈprɒdʒekt/ | n | đồ án tốt nghiệp | I'm working on my graduation project. | Tôi đang làm đồ án tốt nghiệp.
    degree | /dɪˈɡriː/ | n | bằng cấp | I'll get my degree next year. | Năm sau tôi nhận bằng.
    certificate | /səˈtɪfɪkət/ | n | chứng chỉ | I need a B1 certificate to graduate. | Tôi cần chứng chỉ B1 để tốt nghiệp.
    lecturer | /ˈlektʃərə/ | n | giảng viên | My lecturer is very helpful. | Giảng viên của tôi rất nhiệt tình.
    revise | /rɪˈvaɪz/ | v | ôn tập | I revise for exams every evening. | Tối nào tôi cũng ôn thi.
    fail | /feɪl/ | v | trượt | I don't want to fail the exam. | Tôi không muốn trượt.
    pass | /pɑːs/ | v | đậu | I hope to pass the VSTEP exam. | Tôi mong đậu VSTEP.
    self-study | /ˌself ˈstʌdi/ | n | tự học | Self-study is very important. | Tự học rất quan trọng.
    study abroad | /ˈstʌdi əˈbrɔːd/ | phr | du học | I'd like to study abroad. | Tôi muốn du học.
    online course | /ˌɒnlaɪn ˈkɔːs/ | n | khoá học trực tuyến | I took an online course. | Tôi đã học một khoá online.
  `,
  'v-work': `
    part-time job | /ˌpɑːt taɪm ˈdʒɒb/ | n | việc làm thêm | Many students have part-time jobs. | Nhiều sinh viên làm thêm.
    full-time | /ˌfʊl ˈtaɪm/ | adj | toàn thời gian | She works full-time. | Cô ấy làm toàn thời gian.
    employer | /ɪmˈplɔɪə/ | n | chủ, nhà tuyển dụng | Employers want English skills. | Nhà tuyển dụng cần tiếng Anh.
    employee | /ɪmˈplɔɪiː/ | n | nhân viên | The company has 200 employees. | Công ty có 200 nhân viên.
    internship | /ˈɪntɜːnʃɪp/ | n | kỳ thực tập | I did an internship at an IT company. | Tôi thực tập ở công ty IT.
    software developer | /ˈsɒftweə dɪˈveləpə/ | n | lập trình viên | I want to be a software developer. | Tôi muốn làm lập trình viên.
    skill | /skɪl/ | n | kỹ năng | Teamwork is an important skill. | Làm việc nhóm là kỹ năng quan trọng.
    responsibility | /rɪˌspɒnsəˈbɪləti/ | n | trách nhiệm | Managers have a lot of responsibility. | Quản lý có nhiều trách nhiệm.
    stressful | /ˈstresfl/ | adj | căng thẳng | My job is quite stressful. | Công việc khá căng thẳng.
    overtime | /ˈəʊvətaɪm/ | n, adv | làm thêm giờ | He often works overtime. | Anh ấy hay làm thêm giờ.
    colleague | /ˈkɒliːɡ/ | n | đồng nghiệp | My colleagues are friendly. | Đồng nghiệp thân thiện.
    resign | /rɪˈzaɪn/ | v | nghỉ việc | She resigned last month. | Cô ấy nghỉ việc tháng trước.
  `,
  'v-tech': `
    app | /æp/ | n | ứng dụng | I use a banking app every day. | Tôi dùng app ngân hàng hằng ngày.
    download | /ˌdaʊnˈləʊd/ | v | tải về | You can download it for free. | Bạn có thể tải miễn phí.
    upload | /ˌʌpˈləʊd/ | v | tải lên | I uploaded the photos. | Tôi đã tải ảnh lên.
    online shopping | /ˌɒnlaɪn ˈʃɒpɪŋ/ | n | mua sắm trực tuyến | Online shopping is convenient. | Mua sắm online tiện lợi.
    cyberbullying | /ˈsaɪbəbʊliɪŋ/ | n | bắt nạt trên mạng | Cyberbullying is a serious problem. | Bắt nạt trên mạng là vấn đề nghiêm trọng.
    fake news | /ˌfeɪk ˈnjuːz/ | n | tin giả | Be careful of fake news. | Cẩn thận tin giả.
    keep up with | /kiːp ʌp wɪð/ | phr v | theo kịp | It is hard to keep up with new technology. | Khó theo kịp công nghệ mới.
    convenient | /kənˈviːniənt/ | adj | tiện lợi | Smartphones are convenient. | Điện thoại thông minh tiện lợi.
    distracting | /dɪˈstræktɪŋ/ | adj | gây xao nhãng | Phones are distracting in class. | Điện thoại gây xao nhãng trong lớp.
    password | /ˈpɑːswɜːd/ | n | mật khẩu | Use a strong password. | Dùng mật khẩu mạnh.
    programming | /ˈprəʊɡræmɪŋ/ | n | lập trình | I enjoy programming. | Tôi thích lập trình.
    replace | /rɪˈpleɪs/ | v | thay thế | Robots may replace some workers. | Robot có thể thay một số công nhân.
  `,
  'v-money': `
    expensive | /ɪkˈspensɪv/ | adj | đắt | Rent is expensive in the city. | Tiền thuê ở thành phố đắt.
    affordable | /əˈfɔːdəbl/ | adj | giá phải chăng | The food here is affordable. | Đồ ăn ở đây giá phải chăng.
    on sale | /ɒn seɪl/ | phr | đang giảm giá | These shoes are on sale. | Đôi giày đang giảm giá.
    receipt | /rɪˈsiːt/ | n | hoá đơn | Can I have the receipt? | Cho tôi xin hoá đơn.
    refund | /ˈriːfʌnd/ | n | tiền hoàn lại | I asked for a refund. | Tôi yêu cầu hoàn tiền.
    cash | /kæʃ/ | n | tiền mặt | Do you pay by cash or card? | Bạn trả tiền mặt hay thẻ?
    transfer | /ˈtrænsfɜː/ | n, v | chuyển khoản | I paid by bank transfer. | Tôi trả bằng chuyển khoản.
    spend money on | /spend ˈmʌni ɒn/ | phr | tiêu tiền vào | I spend a lot of money on food. | Tôi tiêu nhiều tiền cho ăn uống.
    waste money | /weɪst ˈmʌni/ | phr | phí tiền | Don't waste money on things you don't need. | Đừng phí tiền vào thứ không cần.
    brand | /brænd/ | n | thương hiệu | I don't care about brands. | Tôi không quan tâm thương hiệu.
    shopping mall | /ˈʃɒpɪŋ mɔːl/ | n | trung tâm thương mại | There is a big shopping mall near here. | Gần đây có trung tâm thương mại lớn.
    deliver | /dɪˈlɪvə/ | v | giao hàng | They deliver for free. | Họ giao hàng miễn phí.
  `,
  'v-health': `
    fit | /fɪt/ | adj | khoẻ mạnh, cân đối | I go jogging to stay fit. | Tôi chạy bộ để giữ dáng.
    diet | /ˈdaɪət/ | n | chế độ ăn | I'm on a diet. | Tôi đang ăn kiêng.
    illness | /ˈɪlnəs/ | n | bệnh | Exercise prevents many illnesses. | Tập thể dục ngăn nhiều bệnh.
    headache | /ˈhedeɪk/ | n | đau đầu | I have a terrible headache. | Tôi đau đầu kinh khủng.
    catch a cold | /kætʃ ə kəʊld/ | phr | bị cảm | I rarely catch a cold. | Tôi hiếm khi bị cảm.
    prevent | /prɪˈvent/ | v | ngăn ngừa | Washing hands prevents disease. | Rửa tay ngăn bệnh.
    relieve stress | /rɪˈliːv stres/ | phr | giảm căng thẳng | Yoga helps relieve stress. | Yoga giúp giảm căng thẳng.
    sedentary | /ˈsedntri/ | adj | ít vận động | Office workers have a sedentary lifestyle. | Dân văn phòng ít vận động.
    check-up | /ˈtʃek ʌp/ | n | khám sức khoẻ | I have a check-up every year. | Tôi khám sức khoẻ hằng năm.
    medicine | /ˈmedsn/ | n | thuốc | Take this medicine twice a day. | Uống thuốc này 2 lần/ngày.
    energetic | /ˌenəˈdʒetɪk/ | adj | tràn đầy năng lượng | I feel energetic after exercise. | Tập xong tôi thấy khoẻ khoắn.
    overweight | /ˌəʊvəˈweɪt/ | adj | thừa cân | Fast food makes people overweight. | Đồ ăn nhanh làm người ta thừa cân.
  `,
  'v-env': `
    global warming | /ˌɡləʊbl ˈwɔːmɪŋ/ | n | nóng lên toàn cầu | Global warming is a big problem. | Nóng lên toàn cầu là vấn đề lớn.
    flood | /flʌd/ | n | lũ lụt | Floods often happen in the rainy season. | Lũ hay xảy ra mùa mưa.
    drought | /draʊt/ | n | hạn hán | The drought damaged the crops. | Hạn hán làm hỏng mùa màng.
    reduce | /rɪˈdjuːs/ | v | giảm | We should reduce plastic waste. | Ta nên giảm rác nhựa.
    reuse | /ˌriːˈjuːz/ | v | tái sử dụng | I reuse shopping bags. | Tôi dùng lại túi mua sắm.
    single-use | /ˌsɪŋɡl ˈjuːs/ | adj | dùng một lần | Single-use plastic is harmful. | Nhựa dùng một lần có hại.
    emission | /iˈmɪʃn/ | n | khí thải | Cars produce a lot of emissions. | Ô tô thải ra nhiều khí.
    solar energy | /ˌsəʊlə ˈenədʒi/ | n | năng lượng mặt trời | Tay Ninh has big solar farms. | Tây Ninh có các cánh đồng điện mặt trời lớn.
    deforestation | /diːˌfɒrɪˈsteɪʃn/ | n | phá rừng | Deforestation causes floods. | Phá rừng gây lũ.
    wildlife | /ˈwaɪldlaɪf/ | n | động vật hoang dã | We must protect wildlife. | Ta phải bảo vệ động vật hoang dã.
    litter | /ˈlɪtə/ | n, v | rác; xả rác | Don't litter in the park. | Đừng xả rác trong công viên.
    environmentally friendly | /ɪnˌvaɪrənˌmentəli ˈfrendli/ | adj | thân thiện môi trường | Bikes are environmentally friendly. | Xe đạp thân thiện môi trường.
  `,
  'v-travel': `
    tourist attraction | /ˈtʊərɪst əˈtrækʃn/ | n | điểm tham quan | Ba Den Mountain is a tourist attraction. | Núi Bà Đen là điểm tham quan.
    luggage | /ˈlʌɡɪdʒ/ | n | hành lý | Don't forget your luggage. | Đừng quên hành lý.
    journey | /ˈdʒɜːni/ | n | chuyến đi | The journey took three hours. | Chuyến đi mất 3 tiếng.
    accommodation | /əˌkɒməˈdeɪʃn/ | n | chỗ ở | The price includes accommodation. | Giá đã gồm chỗ ở.
    abroad | /əˈbrɔːd/ | adv | ở nước ngoài | I've never been abroad. | Tôi chưa từng ra nước ngoài.
    passport | /ˈpɑːspɔːt/ | n | hộ chiếu | You need a passport to travel abroad. | Đi nước ngoài cần hộ chiếu.
    explore | /ɪkˈsplɔː/ | v | khám phá | I love exploring new places. | Tôi thích khám phá nơi mới.
    breathtaking | /ˈbreθteɪkɪŋ/ | adj | đẹp ngoạn mục | The view is breathtaking. | Cảnh đẹp ngoạn mục.
    cable car | /ˈkeɪbl kɑː/ | n | cáp treo | We took the cable car up the mountain. | Chúng tôi đi cáp treo lên núi.
    resort | /rɪˈzɔːt/ | n | khu nghỉ dưỡng | We stayed at a beach resort. | Chúng tôi ở khu nghỉ dưỡng biển.
    backpacking | /ˈbækpækɪŋ/ | n | du lịch bụi | Backpacking is cheap. | Du lịch bụi rẻ.
    homestay | /ˈhəʊmsteɪ/ | n | nhà dân cho thuê | We stayed in a homestay in Da Lat. | Chúng tôi ở homestay ở Đà Lạt.
  `,
  'v-transport': `
    motorbike | /ˈməʊtəbaɪk/ | n | xe máy | Most people ride motorbikes in Vietnam. | Đa số người Việt đi xe máy.
    crowded | /ˈkraʊdɪd/ | adj | đông đúc | Buses are crowded in the morning. | Xe buýt đông buổi sáng.
    fare | /feə/ | n | giá vé | The bus fare is cheap. | Giá vé xe buýt rẻ.
    get stuck | /ɡet stʌk/ | phr | bị kẹt | I got stuck in traffic. | Tôi bị kẹt xe.
    accident | /ˈæksɪdənt/ | n | tai nạn | There was an accident on the highway. | Có tai nạn trên cao tốc.
    helmet | /ˈhelmɪt/ | n | mũ bảo hiểm | Always wear a helmet. | Luôn đội mũ bảo hiểm.
    bus stop | /ˈbʌs stɒp/ | n | trạm xe buýt | The bus stop is near my house. | Trạm xe buýt gần nhà tôi.
    highway | /ˈhaɪweɪ/ | n | đường cao tốc | The new highway saves time. | Cao tốc mới tiết kiệm thời gian.
    ride | /raɪd/ | v | đi (xe máy, xe đạp) | I ride my motorbike to school. | Tôi đi xe máy đến trường.
    convenient | /kənˈviːniənt/ | adj | thuận tiện | The metro is very convenient. | Tàu điện rất tiện.
    air pollution | /ˈeə pəˌluːʃn/ | n | ô nhiễm không khí | Traffic causes air pollution. | Giao thông gây ô nhiễm không khí.
    skyscraper | /ˈskaɪskreɪpə/ | n | nhà chọc trời | Landmark 81 is a famous skyscraper. | Landmark 81 là toà nhà chọc trời nổi tiếng.
  `,
};

export const VOCAB_DAILY: DocPart = {
  id: 'v4',
  title: 'Phần 4. Câu nói hằng ngày theo tình huống',
  sections: [
    {
      id: 'v-daily-social',
      title: '13. Chào hỏi, cảm ơn, xin lỗi, đồng ý – không đồng ý',
      body: md`
        ~~~say Chào hỏi và hỏi thăm
        How's it going? - Not bad, thanks. And you? | Dạo này sao rồi? - Cũng ổn, cảm ơn. Còn bạn?
        Long time no see! | Lâu quá không gặp!
        What have you been up to? | Dạo này bạn làm gì?
        Nice to meet you. - Nice to meet you too. | Rất vui được gặp bạn.
        Have a nice day! - Same to you. | Chúc một ngày tốt lành! - Bạn cũng vậy.
        ~~~

        ~~~say Cảm ơn, xin lỗi
        Thanks a lot. - You're welcome. / No problem. | Cảm ơn nhiều. - Không có gì.
        I really appreciate your help. | Tôi rất cảm kích sự giúp đỡ của bạn.
        Sorry, I'm late. - Never mind. / That's OK. | Xin lỗi tôi đến muộn. - Không sao.
        I'm so sorry about that. It won't happen again. | Tôi rất xin lỗi. Sẽ không có lần sau.
        ~~~

        ~~~say Đồng ý, không đồng ý, ý kiến
        I totally agree with you. | Tôi hoàn toàn đồng ý.
        That's a good point. | Ý hay đấy.
        I see what you mean, but… | Tôi hiểu ý bạn, nhưng…
        I'm not sure about that. | Tôi không chắc lắm.
        In my opinion, … / As far as I know, … | Theo tôi… / Theo tôi biết…
        ~~~
      `,
    },
    {
      id: 'v-daily-life',
      title: '14. Mua sắm, ăn uống, hỏi đường, gọi điện',
      body: md`
        ~~~say Mua sắm
        How much is this? | Cái này bao nhiêu tiền?
        Can I try it on? | Tôi mặc thử được không?
        Do you have this in a bigger size? | Có cỡ lớn hơn không?
        Can I pay by card? | Tôi trả bằng thẻ được không?
        I'm just looking, thanks. | Tôi chỉ xem thôi, cảm ơn.
        ~~~

        ~~~say Ăn uống
        A table for two, please. | Cho bàn hai người.
        Could I see the menu, please? | Cho tôi xem thực đơn.
        I'd like a bowl of pho, please. | Cho tôi một tô phở.
        Not too spicy, please. | Đừng cay quá nhé.
        Can I have the bill, please? | Tính tiền giúp tôi.
        ~~~

        ~~~say Hỏi đường
        Excuse me, how can I get to the bus station? | Xin lỗi, đến bến xe đi thế nào?
        Go straight ahead and turn left at the traffic lights. | Đi thẳng rồi rẽ trái ở đèn giao thông.
        It's on your right, next to the bank. | Nó ở bên phải, cạnh ngân hàng.
        Is it far from here? - It's about a ten-minute walk. | Có xa không? - Đi bộ khoảng 10 phút.
        ~~~

        ~~~say Gọi điện
        Hello, this is Hiep speaking. | Alô, Hiệp đây.
        Could I speak to Mr Nam, please? | Cho tôi gặp anh Nam.
        Can I leave a message? | Tôi để lại lời nhắn được không?
        Sorry, I can't hear you very well. Could you speak up? | Xin lỗi tôi nghe không rõ, nói to hơn được không?
        I'll call you back later. | Lát nữa tôi gọi lại.
        ~~~
      `,
    },
    {
      id: 'v-daily-school',
      title: '15. Ở trường, đi làm, xin giúp đỡ',
      body: md`
        ~~~say Ở trường
        Could you explain that again, please? | Thầy/cô giải thích lại được không ạ?
        What's the deadline for the assignment? | Hạn nộp bài là khi nào?
        Can I borrow your notes? | Cho mình mượn vở ghi nhé?
        Let's study together for the exam. | Cùng ôn thi nhé.
        I'm struggling with this exercise. | Mình đang vật lộn với bài này.
        ~~~

        ~~~say Đi làm, xin giúp đỡ
        Could you give me a hand? | Giúp tôi một tay được không?
        Do you have a minute? | Bạn có rảnh một phút không?
        I'll get back to you as soon as possible. | Tôi sẽ phản hồi sớm nhất có thể.
        Let me check and get back to you. | Để tôi kiểm tra rồi báo lại.
        It's up to you. | Tuỳ bạn.
        ~~~

        ~~~tip Cách dùng
        Bôi đen bất kỳ câu nào ở trên để xem nghĩa, IPA và thêm vào thẻ từ của bạn. Bật nút **IPA** ở góc khối để luyện đọc cả câu.
        ~~~
      `,
    },
  ],
};
