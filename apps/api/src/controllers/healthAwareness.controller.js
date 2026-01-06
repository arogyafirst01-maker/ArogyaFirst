const { successResponse, errorResponse } = require('../utils/response.util.js');

// Phase 1: Static health articles data
// Future: Replace with database/CMS integration
const healthArticles = [
  {
    id: 'article-1',
    title: 'Understanding Diabetes Management',
    summary: 'Learn essential tips for managing diabetes effectively through diet, exercise, and medication.',
    content: `Diabetes management requires a comprehensive approach combining proper nutrition, regular physical activity, medication adherence, and blood sugar monitoring. Key strategies include eating balanced meals with controlled carbohydrate intake, exercising for at least 30 minutes daily, taking medications as prescribed, and regularly checking blood glucose levels. Working closely with your healthcare team is crucial for optimal diabetes control and preventing complications.`,
    category: 'chronic-diseases',
    imageUrl: 'https://images.unsplash.com/photo-1526256262350-7da7584cf5eb?w=800',
    author: 'Dr. Sarah Johnson',
    publishedDate: '2024-01-15',
    tags: ['diabetes', 'lifestyle', 'diet', 'exercise']
  },
  {
    id: 'article-2',
    title: 'Heart-Healthy Diet Guidelines',
    summary: 'Discover the best foods to support cardiovascular health and reduce heart disease risk.',
    content: `A heart-healthy diet emphasizes fruits, vegetables, whole grains, lean proteins, and healthy fats while limiting saturated fats, trans fats, sodium, and added sugars. Include omega-3 rich fish, nuts, seeds, and olive oil. Reduce processed foods and red meat consumption. The Mediterranean diet is an excellent example of heart-healthy eating patterns that can significantly reduce cardiovascular disease risk.`,
    category: 'nutrition',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
    author: 'Dr. Michael Chen',
    publishedDate: '2024-01-20',
    tags: ['heart-health', 'diet', 'nutrition', 'prevention']
  },
  {
    id: 'article-3',
    title: 'Benefits of Regular Exercise',
    summary: 'Explore how physical activity improves overall health and prevents chronic diseases.',
    content: `Regular exercise provides numerous health benefits including weight management, improved cardiovascular health, stronger bones and muscles, better mental health, and reduced risk of chronic diseases like diabetes and cancer. Aim for at least 150 minutes of moderate aerobic activity or 75 minutes of vigorous activity weekly, plus muscle-strengthening exercises twice a week. Start slowly and gradually increase intensity.`,
    category: 'exercise',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
    author: 'Dr. Emily Rodriguez',
    publishedDate: '2024-01-25',
    tags: ['exercise', 'fitness', 'wellness', 'prevention']
  },
  {
    id: 'article-4',
    title: 'Managing Stress and Anxiety',
    summary: 'Practical techniques to reduce stress and improve mental well-being.',
    content: `Stress management involves identifying stressors, practicing relaxation techniques like deep breathing and meditation, maintaining regular exercise, getting adequate sleep, and building strong social connections. Cognitive behavioral therapy (CBT) can help change negative thought patterns. Don't hesitate to seek professional help if stress becomes overwhelming. Self-care is essential for mental health.`,
    category: 'mental-health',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    author: 'Dr. James Wilson',
    publishedDate: '2024-02-01',
    tags: ['stress', 'anxiety', 'mental-health', 'mindfulness']
  },
  {
    id: 'article-5',
    title: 'Importance of Preventive Health Screenings',
    summary: 'Why regular health check-ups are crucial for early disease detection.',
    content: `Preventive screenings can detect diseases early when they're most treatable. Essential screenings include blood pressure checks, cholesterol tests, diabetes screening, cancer screenings (mammograms, colonoscopies, Pap tests), and bone density tests. Follow age and risk-appropriate screening schedules recommended by your healthcare provider. Early detection saves lives.`,
    category: 'preventive-care',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
    author: 'Dr. Lisa Anderson',
    publishedDate: '2024-02-05',
    tags: ['screening', 'prevention', 'early-detection', 'checkup']
  },
  {
    id: 'article-6',
    title: 'Hydration and Its Health Benefits',
    summary: 'Understanding the importance of staying properly hydrated throughout the day.',
    content: `Proper hydration is essential for bodily functions including temperature regulation, nutrient transport, waste removal, and joint lubrication. Aim for 8-10 glasses of water daily, more if exercising or in hot weather. Signs of dehydration include dark urine, fatigue, dizziness, and dry mouth. Water is the best choice, but fruits and vegetables also contribute to hydration.`,
    category: 'general',
    imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800',
    author: 'Dr. Robert Martinez',
    publishedDate: '2024-02-10',
    tags: ['hydration', 'water', 'wellness', 'health-basics']
  },
  {
    id: 'article-7',
    title: 'Sleep Hygiene for Better Rest',
    summary: 'Tips for improving sleep quality and establishing healthy sleep patterns.',
    content: `Quality sleep is vital for physical and mental health. Establish a consistent sleep schedule, create a relaxing bedtime routine, keep your bedroom cool and dark, avoid screens before bed, limit caffeine and alcohol, and exercise regularly (but not close to bedtime). Adults need 7-9 hours of sleep nightly. Poor sleep increases risk of obesity, diabetes, and heart disease.`,
    category: 'general',
    imageUrl: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800',
    author: 'Dr. Patricia Lee',
    publishedDate: '2024-02-15',
    tags: ['sleep', 'rest', 'wellness', 'health-habits']
  },
  {
    id: 'article-8',
    title: 'Protein-Rich Foods for Muscle Health',
    summary: 'Essential protein sources to support muscle growth and maintenance.',
    content: `Protein is crucial for building and repairing tissues, making enzymes and hormones, and supporting immune function. Include lean meats, fish, eggs, dairy, legumes, nuts, and seeds in your diet. Adults need 0.8g protein per kg body weight daily, more for athletes. Distribute protein intake across meals for optimal muscle protein synthesis. Plant-based proteins can meet all nutritional needs when varied.`,
    category: 'nutrition',
    imageUrl: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
    author: 'Dr. David Thompson',
    publishedDate: '2024-02-20',
    tags: ['protein', 'nutrition', 'muscle', 'diet']
  },
  {
    id: 'article-9',
    title: 'Strength Training Benefits',
    summary: 'Why resistance exercises are important for all ages.',
    content: `Strength training builds muscle mass, increases bone density, improves metabolism, enhances balance and coordination, and reduces injury risk. It's beneficial for all ages, helping older adults maintain independence and younger people build a strong foundation. Start with bodyweight exercises or light weights, progress gradually, and include all major muscle groups twice weekly. Proper form prevents injuries.`,
    category: 'exercise',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800',
    author: 'Dr. Jennifer Brown',
    publishedDate: '2024-02-25',
    tags: ['strength-training', 'exercise', 'fitness', 'muscle']
  },
  {
    id: 'article-10',
    title: 'Managing Hypertension Naturally',
    summary: 'Lifestyle changes to help control high blood pressure.',
    content: `Lifestyle modifications can significantly reduce blood pressure: maintain healthy weight, exercise regularly, reduce sodium intake (<2300mg daily), eat potassium-rich foods, limit alcohol, quit smoking, manage stress, and get adequate sleep. The DASH diet (Dietary Approaches to Stop Hypertension) emphasizes fruits, vegetables, whole grains, and lean proteins while limiting salt and saturated fats.`,
    category: 'chronic-diseases',
    imageUrl: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800',
    author: 'Dr. Christopher Davis',
    publishedDate: '2024-03-01',
    tags: ['hypertension', 'blood-pressure', 'lifestyle', 'prevention']
  },
  {
    id: 'article-11',
    title: 'Mindfulness Meditation for Beginners',
    summary: 'Simple meditation techniques to reduce stress and improve focus.',
    content: `Mindfulness meditation involves focusing on the present moment without judgment. Start with 5-10 minutes daily, sitting comfortably with eyes closed, focusing on your breath. When thoughts arise, acknowledge them without attachment and return to breathing. Regular practice reduces stress, anxiety, and depression while improving concentration, emotional regulation, and overall well-being. Apps and guided meditations can help beginners.`,
    category: 'mental-health',
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800',
    author: 'Dr. Amanda White',
    publishedDate: '2024-03-05',
    tags: ['mindfulness', 'meditation', 'stress-relief', 'mental-health']
  },
  {
    id: 'article-12',
    title: 'Vaccination: Your Best Protection',
    summary: 'Understanding the importance of immunizations for disease prevention.',
    content: `Vaccines protect against serious infectious diseases by training your immune system to recognize and fight pathogens. Follow recommended vaccination schedules for children and adults. Important vaccines include flu shots (annually), COVID-19, tetanus boosters, shingles vaccine (50+), and pneumonia vaccine (65+). Vaccines are safe, effective, and crucial for community immunity. Consult your healthcare provider about your vaccination needs.`,
    category: 'preventive-care',
    imageUrl: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800',
    author: 'Dr. Kevin Garcia',
    publishedDate: '2024-03-10',
    tags: ['vaccination', 'immunization', 'prevention', 'public-health']
  },
  {
    id: 'article-13',
    title: 'Bone Health and Osteoporosis Prevention',
    summary: 'How to maintain strong bones throughout your life.',
    content: `Bone health requires adequate calcium (1000-1200mg daily), vitamin D (600-800 IU), weight-bearing exercise, and avoiding smoking and excessive alcohol. Peak bone mass is built in youth, but it's never too late to strengthen bones. Weight-bearing exercises like walking, jogging, and strength training stimulate bone formation. Get bone density screenings as recommended, especially post-menopausal women and men over 70.`,
    category: 'preventive-care',
    imageUrl: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800',
    author: 'Dr. Rachel Kim',
    publishedDate: '2024-03-15',
    tags: ['bone-health', 'osteoporosis', 'calcium', 'prevention']
  },
  {
    id: 'article-14',
    title: 'Gut Health and Probiotics',
    summary: 'The role of gut bacteria in overall health and immunity.',
    content: `A healthy gut microbiome supports digestion, immunity, mental health, and disease prevention. Promote gut health by eating fiber-rich foods, fermented foods (yogurt, kefir, sauerkraut, kimchi), limiting processed foods and antibiotics, managing stress, and staying hydrated. Probiotics (beneficial bacteria) and prebiotics (food for bacteria) work together to maintain microbial balance. A diverse diet supports gut diversity.`,
    category: 'nutrition',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    author: 'Dr. Steven Park',
    publishedDate: '2024-03-20',
    tags: ['gut-health', 'probiotics', 'digestion', 'immunity']
  },
  {
    id: 'article-15',
    title: 'Yoga for Flexibility and Balance',
    summary: 'How yoga practice benefits physical and mental well-being.',
    content: `Yoga combines physical poses, breathing exercises, and meditation to improve flexibility, strength, balance, and mental clarity. Regular practice reduces stress, improves posture, relieves chronic pain, enhances sleep quality, and promotes relaxation. Suitable for all fitness levels with modifications available. Start with beginner classes or videos, focus on proper alignment, and practice consistently for best results.`,
    category: 'exercise',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
    author: 'Dr. Michelle Torres',
    publishedDate: '2024-03-25',
    tags: ['yoga', 'flexibility', 'balance', 'mind-body']
  },
  {
    id: 'article-16',
    title: 'Managing Chronic Pain',
    summary: 'Strategies for coping with long-term pain conditions.',
    content: `Chronic pain management requires a multifaceted approach including medications, physical therapy, exercise, stress management, and sometimes psychological therapy. Techniques like heat/cold therapy, massage, acupuncture, and mindfulness can provide relief. Maintain regular activity within your limits, as complete rest can worsen pain. Work with healthcare providers to develop a comprehensive pain management plan tailored to your needs.`,
    category: 'chronic-diseases',
    imageUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
    author: 'Dr. Daniel Moore',
    publishedDate: '2024-04-01',
    tags: ['chronic-pain', 'pain-management', 'therapy', 'wellness']
  },
  {
    id: 'article-17',
    title: 'Healthy Aging Tips',
    summary: 'Maintaining vitality and independence as you age.',
    content: `Healthy aging involves staying physically active, eating nutritiously, maintaining social connections, challenging your mind, managing chronic conditions, getting regular health screenings, and maintaining a positive outlook. Strength training preserves muscle mass and bone density. Brain exercises and learning new skills keep cognition sharp. Quality sleep and stress management are crucial. Stay engaged with hobbies and community activities.`,
    category: 'general',
    imageUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?w=800',
    author: 'Dr. Carol Martinez',
    publishedDate: '2024-04-05',
    tags: ['aging', 'seniors', 'wellness', 'longevity']
  },
  {
    id: 'article-18',
    title: 'Depression: Signs and Support',
    summary: 'Recognizing depression symptoms and finding help.',
    content: `Depression is more than sadness—it's a serious medical condition with symptoms including persistent low mood, loss of interest, fatigue, sleep changes, appetite changes, difficulty concentrating, and thoughts of self-harm. Treatment is effective and may include therapy, medication, lifestyle changes, and support groups. Don't hesitate to seek professional help. Mental health is as important as physical health. Recovery is possible.`,
    category: 'mental-health',
    imageUrl: 'https://images.unsplash.com/photo-1534885305-6c40634bfaaf?w=800',
    author: 'Dr. Thomas Anderson',
    publishedDate: '2024-04-10',
    tags: ['depression', 'mental-health', 'therapy', 'support']
  },
  {
    id: 'article-19',
    title: 'Vitamin D: The Sunshine Vitamin',
    summary: 'Understanding vitamin D role in health and how to get enough.',
    content: `Vitamin D is essential for bone health, immune function, and mood regulation. Sources include sunlight exposure (10-30 minutes daily), fatty fish, egg yolks, and fortified foods. Many people are deficient, especially in winter or with limited sun exposure. Consider supplements if levels are low (test with your doctor). Adequate vitamin D reduces risk of osteoporosis, some cancers, and autoimmune diseases.`,
    category: 'nutrition',
    imageUrl: 'https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=800',
    author: 'Dr. Laura Jackson',
    publishedDate: '2024-04-15',
    tags: ['vitamin-d', 'nutrition', 'supplements', 'bone-health']
  },
  {
    id: 'article-20',
    title: 'Lung Health and Breathing Exercises',
    summary: 'Techniques to improve respiratory function and lung capacity.',
    content: `Healthy lungs require avoiding smoking and air pollution, exercising regularly, and practicing breathing exercises. Diaphragmatic breathing, pursed-lip breathing, and deep breathing exercises improve lung capacity and oxygen delivery. Cardiovascular exercise strengthens respiratory muscles. Stay current with vaccinations (flu, pneumonia) to prevent respiratory infections. If you have chronic lung disease, work with your healthcare team for optimal management.`,
    category: 'preventive-care',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
    author: 'Dr. Mark Robinson',
    publishedDate: '2024-04-20',
    tags: ['lung-health', 'breathing', 'respiratory', 'exercise']
  }
];

const getArticles = async (req, res) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    // Filter articles
    let filteredArticles = [...healthArticles];

    // Filter by category
    if (category) {
      filteredArticles = filteredArticles.filter(article => article.category === category);
    }

    // Filter by search (case-insensitive search in title, summary, and content)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredArticles = filteredArticles.filter(article =>
        article.title.toLowerCase().includes(searchLower) ||
        article.summary.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Calculate pagination
    const total = filteredArticles.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;

    // Get paginated results
    const paginatedArticles = filteredArticles.slice(skip, skip + limitNum);

    return successResponse(res, {
      articles: paginatedArticles,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    }, 'Articles retrieved successfully');
  } catch (error) {
    console.error('Get articles error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve articles', 500);
  }
};

module.exports = {
  getArticles,
};
