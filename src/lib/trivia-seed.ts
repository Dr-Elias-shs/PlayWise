import type { TriviaCategory, TriviaGrade, TriviaLevel } from './trivia';

type SeedQ = {
  question: string;
  options: string[];
  correct_index: number;
  category: TriviaCategory;
  grade: TriviaGrade;
  difficulty: TriviaLevel;
  source: string;
};

function q(
  question: string,
  options: string[],
  correct_index: number,
  category: TriviaCategory,
  grade: TriviaGrade,
  difficulty: TriviaLevel,
): SeedQ {
  return { question, options, correct_index, category, grade, difficulty, source: 'seed' };
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────

const history: SeedQ[] = [
  // Grade 1 — Easy
  q('What is the capital city of Lebanon?', ['Beirut','Tripoli','Sidon','Tyre'], 0, 'history', '1', 'easy'),
  q('What tree is on the Lebanese flag?', ['Cedar','Palm','Olive','Pine'], 0, 'history', '1', 'easy'),
  q('How many colors does the Lebanese flag have?', ['3','2','4','5'], 0, 'history', '1', 'easy'),
  q('Lebanon is a country in which part of the world?', ['Middle East','Africa','Europe','Asia Far East'], 0, 'history', '1', 'easy'),

  // Grade 2 — Easy
  q('What river runs through Beirut?', ['Beirut River','Litani','Nahr el-Kalb','Orontes'], 0, 'history', '2', 'easy'),
  q('Which sea borders Lebanon to the west?', ['Mediterranean Sea','Red Sea','Dead Sea','Black Sea'], 0, 'history', '2', 'easy'),
  q('Lebanon is famous for its ancient city called:', ['Byblos','Rome','Athens','Cairo'], 0, 'history', '2', 'easy'),
  q('Which country borders Lebanon to the north and east?', ['Syria','Jordan','Israel','Turkey'], 0, 'history', '2', 'easy'),

  // Grade 3 — Easy
  q('What ancient civilization built Baalbek?', ['Phoenicians / Romans','Greeks','Egyptians','Persians'], 0, 'history', '3', 'easy'),
  q('The Phoenicians were famous for creating what?', ['The alphabet','Gunpowder','The wheel','Paper'], 0, 'history', '3', 'easy'),
  q('Which empire ruled Lebanon for hundreds of years before independence?', ['Ottoman Empire','British Empire','French Empire','Roman Empire'], 0, 'history', '3', 'easy'),

  // Grade 3 — Medium
  q('In what year did Lebanon gain independence?', ['1943','1920','1958','1975'], 0, 'history', '3', 'medium'),
  q('What is the name of the famous Roman temples in Baalbek?', ['Temple of Jupiter','Temple of Zeus','Temple of Ares','Temple of Poseidon'], 0, 'history', '3', 'medium'),

  // Grade 4 — Easy
  q('Which ancient people are credited with spreading the alphabet to Europe?', ['Phoenicians','Romans','Greeks','Egyptians'], 0, 'history', '4', 'easy'),
  q('The ancient city of Carthage was founded by people from which Lebanese city?', ['Tyre','Sidon','Byblos','Beirut'], 0, 'history', '4', 'easy'),

  // Grade 4 — Medium
  q('Lebanon was under French mandate starting from which year?', ['1920','1916','1945','1943'], 0, 'history', '4', 'medium'),
  q('Who is considered the father of Lebanese independence?', ['Bechara El Khoury','Riad El Solh','Camille Chamoun','Fouad Chehab'], 0, 'history', '4', 'medium'),
  q('What major event began in Lebanon in 1975?', ['Civil War','War of Independence','Arab Spring','Crusades'], 0, 'history', '4', 'medium'),

  // Grade 4 — Hard
  q('Which pharaoh of Egypt sent tribute to the Phoenician city of Byblos for cedar wood?', ['Ramesses II','Tutankhamun','Sneferu','Thutmose III'], 2, 'history', '4', 'hard'),

  // Grade 5 — Easy
  q('The city of Byblos gave us which important word?', ['Bible','Book','Ballot','Babel'], 0, 'history', '5', 'easy'),
  q('Which crusader order built Byblos Castle?', ['Crusaders (Franks)','Knights Templar','Hospitallers','Teutonic Knights'], 0, 'history', '5', 'easy'),

  // Grade 5 — Medium
  q('What was the first country to recognize Lebanese independence?', ['Syria','France','United States','Egypt'], 0, 'history', '5', 'medium'),
  q('The Taif Agreement of 1989 ended which conflict in Lebanon?', ['Civil War','War with Israel','Ottoman occupation','French mandate'], 0, 'history', '5', 'medium'),
  q('Baalbek was known in ancient times by what name?', ['Heliopolis','Alexandria','Palmyra','Antioch'], 0, 'history', '5', 'medium'),

  // Grade 5 — Hard
  q('Who was the Phoenician princess who, according to Greek myth, gave Europe its name?', ['Europa','Dido','Astarte','Cleopatra'], 0, 'history', '5', 'hard'),
  q('Which Lebanese poet and philosopher wrote "The Prophet"?', ['Gibran Khalil Gibran','Nizar Qabbani','Mikhail Naimy','Said Akl'], 0, 'history', '5', 'hard'),

  // Grade 6 — Easy
  q('World War I ended in which year?', ['1918','1914','1920','1916'], 0, 'history', '6', 'easy'),
  q('World War II ended in which year?', ['1945','1939','1943','1950'], 0, 'history', '6', 'easy'),

  // Grade 6 — Medium
  q('Which agreement gave France control of Lebanon after World War I?', ['Sykes-Picot Agreement','Balfour Declaration','Treaty of Versailles','San Remo Conference'], 3, 'history', '6', 'medium'),
  q('The United Nations was founded in which year?', ['1945','1919','1939','1955'], 0, 'history', '6', 'medium'),
  q('The Roman god Jupiter was equivalent to which Greek god?', ['Zeus','Ares','Apollo','Hermes'], 0, 'history', '6', 'medium'),

  // Grade 6 — Hard
  q('Which ancient Phoenician city is believed to have had the first alphabet?', ['Byblos','Tyre','Sidon','Carthage'], 0, 'history', '6', 'hard'),
  q('Emperor Justinian rebuilt the famous law school in which Lebanese city?', ['Beirut','Sidon','Tyre','Tripoli'], 0, 'history', '6', 'hard'),
];

// ─── SLS (Sagesse Life Skills) ────────────────────────────────────────────────

const sls: SeedQ[] = [
  // Grade 1 — Easy
  q('What do you say when someone helps you?', ['Thank you','Sorry','Please','Hello'], 0, 'sls', '1', 'easy'),
  q('What should you do before eating food?', ['Wash your hands','Play games','Watch TV','Sleep'], 0, 'sls', '1', 'easy'),
  q('Where do you go to learn and study?', ['School','Hospital','Market','Park'], 0, 'sls', '1', 'easy'),
  q('What is a good way to solve a fight with a friend?', ['Talk and listen','Ignore them','Shout','Walk away forever'], 0, 'sls', '1', 'easy'),

  // Grade 2 — Easy
  q('What should you do if a stranger offers you candy?', ['Say no and find an adult','Take it and say thank you','Follow them','Share with friends'], 0, 'sls', '2', 'easy'),
  q('How many hours of sleep should a young child get each night?', ['About 9-11 hours','About 4-5 hours','About 6-7 hours','About 12-14 hours'], 0, 'sls', '2', 'easy'),
  q('What do we call someone who tells a teacher when they see bullying?', ['A helper / upstander','A bully','A bystander','A troublemaker'], 0, 'sls', '2', 'easy'),
  q('Which of these is a healthy food choice?', ['An apple','A bag of chips','A soda','A candy bar'], 0, 'sls', '2', 'easy'),

  // Grade 3 — Easy
  q('What is teamwork?', ['Working together to reach a goal','Doing everything alone','Competing to win','Letting others do the work'], 0, 'sls', '3', 'easy'),
  q('What should you do if you feel angry?', ['Take deep breaths and calm down','Hit something','Shout at everyone','Run away'], 0, 'sls', '3', 'easy'),

  // Grade 3 — Medium
  q('What is empathy?', ['Understanding how others feel','Feeling sorry for yourself','Ignoring others','Being very smart'], 0, 'sls', '3', 'medium'),
  q('What does "honesty" mean?', ['Always telling the truth','Being very smart','Helping others','Sharing everything'], 0, 'sls', '3', 'medium'),
  q('Which behavior shows respect?', ['Listening when others speak','Interrupting people','Talking over others','Looking at your phone'], 0, 'sls', '3', 'medium'),

  // Grade 4 — Easy
  q('What is peer pressure?', ['Being influenced to do something by people your age','A pressure test at the doctor','Homework pressure','Sports pressure'], 0, 'sls', '4', 'easy'),

  // Grade 4 — Medium
  q('What is a "growth mindset"?', ['Believing you can improve with effort','Thinking you are already perfect','Avoiding hard tasks','Getting bigger physically'], 0, 'sls', '4', 'medium'),
  q('Which is an example of a healthy way to manage stress?', ['Exercise or deep breathing','Skipping meals','Playing video games all day','Ignoring the problem'], 0, 'sls', '4', 'medium'),
  q('What does "responsibility" mean?', ['Being in charge of your duties','Telling others what to do','Having many toys','Getting good grades only'], 0, 'sls', '4', 'medium'),

  // Grade 4 — Hard
  q('Which of these describes "active listening"?', ['Maintaining eye contact, nodding, and not interrupting','Thinking about your reply while they talk','Checking your phone','Finishing their sentences'], 0, 'sls', '4', 'hard'),

  // Grade 5 — Medium
  q('What is "digital citizenship"?', ['Using technology responsibly and ethically','Owning a smartphone','Playing online games','Having many followers'], 0, 'sls', '5', 'medium'),
  q('Which is an example of a "life skill"?', ['Cooking a meal','Knowing all capitals','Running fast','Being tall'], 0, 'sls', '5', 'medium'),
  q('What should you do if you receive a hurtful message online?', ['Tell a trusted adult and block the sender','Reply with an equally hurtful message','Share it with everyone','Ignore it and keep it secret'], 0, 'sls', '5', 'medium'),

  // Grade 5 — Hard
  q('What is the difference between a "want" and a "need"?', ['A need is essential for survival; a want is a desire','They mean the same thing','A want is more important','Needs cost more money'], 0, 'sls', '5', 'hard'),
  q('What does "civic responsibility" mean?', ['Contributing positively to your community','Paying taxes only','Voting in elections only','Following rules only'], 0, 'sls', '5', 'hard'),

  // Grade 6 — Medium
  q('What is a budget?', ['A plan for how to spend and save money','A type of bank account','A way to earn money','A list of items to buy'], 0, 'sls', '6', 'medium'),
  q('Which value is most associated with the Sagesse school spirit?', ['Excellence, Solidarity, and Service','Competition, Speed, and Victory','Wealth, Fame, and Power','Obedience, Silence, and Discipline'], 0, 'sls', '6', 'medium'),

  // Grade 6 — Hard
  q('What is "conflict resolution"?', ['Finding a peaceful solution to a disagreement','Winning an argument','Avoiding all conflicts','Letting someone else decide'], 0, 'sls', '6', 'hard'),
  q('Which of these best describes "social entrepreneurship"?', ['Creating a business that also solves a social problem','Starting a business to make maximum profit','Working for a charity','Investing in stocks'], 0, 'sls', '6', 'hard'),
];

// ─── MATH ─────────────────────────────────────────────────────────────────────

const math: SeedQ[] = [
  // Grade 1 — Easy
  q('What is 3 + 4?', ['7','6','8','9'], 0, 'math', '1', 'easy'),
  q('How many sides does a triangle have?', ['3','4','2','5'], 0, 'math', '1', 'easy'),
  q('What number comes after 9?', ['10','8','11','7'], 0, 'math', '1', 'easy'),
  q('What is 5 − 2?', ['3','2','4','1'], 0, 'math', '1', 'easy'),

  // Grade 2 — Easy
  q('What is 6 × 2?', ['12','10','14','8'], 0, 'math', '2', 'easy'),
  q('How many sides does a square have?', ['4','3','5','6'], 0, 'math', '2', 'easy'),
  q('What is 15 − 7?', ['8','6','9','7'], 0, 'math', '2', 'easy'),
  q('What is double 9?', ['18','16','17','20'], 0, 'math', '2', 'easy'),

  // Grade 3 — Easy
  q('What is 7 × 8?', ['56','54','58','48'], 0, 'math', '3', 'easy'),
  q('What is 81 ÷ 9?', ['9','8','7','10'], 0, 'math', '3', 'easy'),
  q('How many centimetres in a metre?', ['100','10','1000','50'], 0, 'math', '3', 'easy'),

  // Grade 3 — Medium
  q('What is the perimeter of a square with side 5 cm?', ['20 cm','15 cm','25 cm','10 cm'], 0, 'math', '3', 'medium'),
  q('What is half of 46?', ['23','22','24','21'], 0, 'math', '3', 'medium'),
  q('How many minutes are in an hour?', ['60','30','100','24'], 0, 'math', '3', 'medium'),

  // Grade 4 — Easy
  q('What is 1/2 + 1/4?', ['3/4','1/6','2/6','1/3'], 0, 'math', '4', 'easy'),
  q('What is 25% of 80?', ['20','25','15','30'], 0, 'math', '4', 'easy'),

  // Grade 4 — Medium
  q('What is 3/5 of 40?', ['24','20','25','30'], 0, 'math', '4', 'medium'),
  q('What is the area of a rectangle 6 cm × 9 cm?', ['54 cm²','45 cm²','63 cm²','36 cm²'], 0, 'math', '4', 'medium'),
  q('Round 3.78 to the nearest tenth.', ['3.8','3.7','4.0','3.9'], 0, 'math', '4', 'medium'),

  // Grade 4 — Hard
  q('What is the LCM of 4 and 6?', ['12','24','6','8'], 0, 'math', '4', 'hard'),
  q('What is the GCD of 36 and 48?', ['12','6','18','24'], 0, 'math', '4', 'hard'),

  // Grade 5 — Easy
  q('What is 2.5 × 4?', ['10','8','12','9'], 0, 'math', '5', 'easy'),
  q('What is 40% of 150?', ['60','50','70','80'], 0, 'math', '5', 'easy'),

  // Grade 5 — Medium
  q('What is the value of 3²?', ['9','6','8','12'], 0, 'math', '5', 'medium'),
  q('What is the ratio 15:25 in simplest form?', ['3:5','1:2','5:8','2:3'], 0, 'math', '5', 'medium'),
  q('A shirt costs $40 after a 20% discount. What was the original price?', ['$50','$48','$45','$55'], 0, 'math', '5', 'medium'),

  // Grade 5 — Hard
  q('What is the prime factorisation of 60?', ['2² × 3 × 5','2 × 3 × 5','2³ × 5','2 × 3² × 5'], 0, 'math', '5', 'hard'),
  q('What is the mean of 4, 7, 13, 2, 9?', ['7','6','8','9'], 0, 'math', '5', 'hard'),

  // Grade 6 — Easy
  q('What is −3 + (−5)?', ['−8','−2','8','2'], 0, 'math', '6', 'easy'),

  // Grade 6 — Medium
  q('Solve for x: 3x − 7 = 14', ['x = 7','x = 3','x = 9','x = 21'], 0, 'math', '6', 'medium'),
  q('What is the area of a triangle with base 10 cm and height 6 cm?', ['30 cm²','60 cm²','20 cm²','25 cm²'], 0, 'math', '6', 'medium'),
  q('What is 3/4 ÷ 1/2?', ['3/2','6/4','3/8','1/2'], 0, 'math', '6', 'medium'),

  // Grade 6 — Hard
  q('A car travels 180 km in 2.5 hours. What is its average speed?', ['72 km/h','80 km/h','68 km/h','90 km/h'], 0, 'math', '6', 'hard'),
  q('What is the surface area of a cube with edge 4 cm?', ['96 cm²','64 cm²','48 cm²','80 cm²'], 0, 'math', '6', 'hard'),
];

// ─── LANGUAGES ────────────────────────────────────────────────────────────────

const languages: SeedQ[] = [
  // Grade 1 — Easy
  q('How many vowels are in the English alphabet?', ['5','4','6','7'], 0, 'languages', '1', 'easy'),
  q('What letter does "Apple" start with?', ['A','P','E','B'], 0, 'languages', '1', 'easy'),
  q('Which word is an animal?', ['Dog','Run','Big','Red'], 0, 'languages', '1', 'easy'),
  q('What does "bonjour" mean in English?', ['Hello','Goodbye','Thank you','Please'], 0, 'languages', '1', 'easy'),

  // Grade 2 — Easy
  q('What is the plural of "child"?', ['Children','Childs','Childes','Child'], 0, 'languages', '2', 'easy'),
  q('Which sentence is correct?', ['She runs fast.','She run fast.','She running fast.','She runned fast.'], 0, 'languages', '2', 'easy'),
  q('What does the French word "merci" mean?', ['Thank you','Sorry','Please','Yes'], 0, 'languages', '2', 'easy'),
  q('What is the opposite of "hot"?', ['Cold','Warm','Cool','Icy'], 0, 'languages', '2', 'easy'),

  // Grade 3 — Easy
  q('What is a synonym for "happy"?', ['Joyful','Sad','Angry','Tired'], 0, 'languages', '3', 'easy'),
  q('What type of word is "quickly"?', ['Adverb','Noun','Adjective','Verb'], 0, 'languages', '3', 'easy'),

  // Grade 3 — Medium
  q('What is the past tense of "go"?', ['Went','Goed','Gone','Goes'], 0, 'languages', '3', 'medium'),
  q('Which word is a proper noun?', ['Beirut','city','river','mountain'], 0, 'languages', '3', 'medium'),
  q('What punctuation ends a question?', ['?','!','.','–'], 0, 'languages', '3', 'medium'),

  // Grade 4 — Easy
  q('What is the Arabic word for "school"?', ['مدرسة','كتاب','قلم','باب'], 0, 'languages', '4', 'easy'),

  // Grade 4 — Medium
  q('What is a "metaphor"?', ['Saying something IS something else to compare','Saying something is LIKE something else','A story with a moral','A rhyming poem'], 0, 'languages', '4', 'medium'),
  q('What is the French word for "book"?', ['Livre','Lire','Libra','Livrer'], 0, 'languages', '4', 'medium'),
  q('Which of these is a compound sentence?', ['I like pizza, and she likes pasta.','I like pizza.','Because I like pizza.','Pizza.'], 0, 'languages', '4', 'medium'),

  // Grade 4 — Hard
  q('What is the subjunctive mood used for?', ['Expressing wishes, doubts, or hypothetical situations','Describing past actions','Giving commands','Stating facts'], 0, 'languages', '4', 'hard'),

  // Grade 5 — Medium
  q('What literary device is used in: "The wind whispered secrets"?', ['Personification','Metaphor','Simile','Alliteration'], 0, 'languages', '5', 'medium'),
  q('What is a "prefix"?', ['Letters added to the beginning of a word to change its meaning','Letters added to the end','The root of a word','A type of verb'], 0, 'languages', '5', 'medium'),
  q('How many syllables does "beautiful" have?', ['3','2','4','5'], 0, 'languages', '5', 'medium'),

  // Grade 5 — Hard
  q('What is an "oxymoron"?', ['Two contradictory words placed together','A very long word','A word that sounds like its meaning','A word with no meaning'], 0, 'languages', '5', 'hard'),
  q('In French, what gender is the word "voiture" (car)?', ['Feminine','Masculine','Neutral','Both'], 0, 'languages', '5', 'hard'),

  // Grade 6 — Medium
  q('Which writing style uses "I" and personal experience?', ['First-person narrative','Third-person narrative','Second-person narrative','Omniscient narrative'], 0, 'languages', '6', 'medium'),
  q('What is alliteration?', ['Repetition of the same consonant sound at the start of words','Rhyming words at the end of lines','Using very long sentences','A form of poetry'], 0, 'languages', '6', 'medium'),

  // Grade 6 — Hard
  q('What is the term for the main idea a piece of literature explores?', ['Theme','Plot','Setting','Motif'], 0, 'languages', '6', 'hard'),
  q('Which of the following is in the passive voice?', ['The ball was kicked by Tom.','Tom kicked the ball.','Tom kicks the ball.','Tom is kicking the ball.'], 0, 'languages', '6', 'hard'),
];

// ─── FOOTBALL ─────────────────────────────────────────────────────────────────

const football: SeedQ[] = [
  // Grade 1 — Easy
  q('How many players are on a football team on the field?', ['11','10','9','12'], 0, 'football', '1', 'easy'),
  q('What shape is a standard football?', ['Round (sphere)','Oval','Square','Cylinder'], 0, 'football', '1', 'easy'),
  q('What do you kick into to score a goal?', ['The net','The post','The corner flag','The sideline'], 0, 'football', '1', 'easy'),

  // Grade 2 — Easy
  q('Which country won the 2022 FIFA World Cup?', ['Argentina','France','Brazil','Germany'], 0, 'football', '2', 'easy'),
  q('Who is the goalkeeper\'s job?', ['Stop the ball from going in the goal','Score goals','Run the fastest','Manage the team'], 0, 'football', '2', 'easy'),
  q('How long is a standard football match?', ['90 minutes','60 minutes','45 minutes','120 minutes'], 0, 'football', '2', 'easy'),

  // Grade 3 — Easy
  q('Which player wears the number 10 shirt typically?', ['The playmaker / best attacker','The goalkeeper','The defender','The referee'], 0, 'football', '3', 'easy'),
  q('What is a "hat-trick"?', ['Three goals by one player in one match','A type of foul','A referee decision','A special kick'], 0, 'football', '3', 'easy'),

  // Grade 3 — Medium
  q('How many teams play in the UEFA Champions League group stage each season?', ['32','20','24','16'], 0, 'football', '3', 'medium'),
  q('Cristiano Ronaldo plays for which national team?', ['Portugal','Spain','Brazil','Italy'], 0, 'football', '3', 'medium'),

  // Grade 4 — Medium
  q('Which country has won the most FIFA World Cups?', ['Brazil','Germany','Argentina','Italy'], 0, 'football', '4', 'medium'),
  q('What trophy is awarded to the best player at the FIFA World Cup?', ['Golden Ball','Golden Boot','Golden Glove','Silver Ball'], 0, 'football', '4', 'medium'),
  q('In which city is Anfield stadium located?', ['Liverpool','Manchester','London','Leeds'], 0, 'football', '4', 'medium'),

  // Grade 4 — Hard
  q('Who holds the record for the most goals in a single FIFA World Cup tournament (13 goals)?', ['Just Fontaine','Ronaldo','Miroslav Klose','Gerd Müller'], 0, 'football', '4', 'hard'),

  // Grade 5 — Medium
  q('Which club has won the most UEFA Champions League titles?', ['Real Madrid','Barcelona','Bayern Munich','Liverpool'], 0, 'football', '5', 'medium'),
  q('What is "the offside rule" about?', ['A player cannot be behind the last defender when the ball is played to them','A player cannot touch the ball with their hands','A foul tackle','A player leaving the field'], 0, 'football', '5', 'medium'),

  // Grade 5 — Hard
  q('Which player won the Ballon d\'Or the most times (8 times)?', ['Lionel Messi','Cristiano Ronaldo','Ronaldinho','Zinedine Zidane'], 0, 'football', '5', 'hard'),
  q('In which year was FIFA founded?', ['1904','1910','1930','1896'], 0, 'football', '5', 'hard'),

  // Grade 6 — Medium
  q('Lebanon\'s national football team plays in which confederation?', ['AFC (Asian)','UEFA (European)','CAF (African)','CONMEBOL (South American)'], 0, 'football', '6', 'medium'),
  q('The "Premier League" is the top football division in which country?', ['England','France','Spain','Germany'], 0, 'football', '6', 'medium'),

  // Grade 6 — Hard
  q('Which player is nicknamed "O Fenômeno" (The Phenomenon)?', ['Ronaldo Nazário (Brazil)','Cristiano Ronaldo','Ronaldinho','Romário'], 0, 'football', '6', 'hard'),
  q('Which country hosted the first-ever FIFA World Cup in 1930?', ['Uruguay','Brazil','France','Italy'], 0, 'football', '6', 'hard'),
];

// ─── FORMULA 1 ────────────────────────────────────────────────────────────────

const formula1: SeedQ[] = [
  // Grade 1 — Easy
  q('Formula 1 cars go very…', ['Fast','Slow','High','Low'], 0, 'formula1', '1', 'easy'),
  q('What does a race driver wear on their head for safety?', ['Helmet','Hat','Cap','Crown'], 0, 'formula1', '1', 'easy'),
  q('What color flag means the race is over?', ['Chequered (black and white)','Red','Yellow','Green'], 0, 'formula1', '1', 'easy'),

  // Grade 2 — Easy
  q('How many wheels does a Formula 1 car have?', ['4','6','8','2'], 0, 'formula1', '2', 'easy'),
  q('Which country hosts the Monaco Grand Prix?', ['Monaco','France','Italy','Spain'], 0, 'formula1', '2', 'easy'),
  q('The driver who finishes first is on the "podium" in which position?', ['1st','2nd','3rd','4th'], 0, 'formula1', '2', 'easy'),

  // Grade 3 — Medium
  q('Who drives for Red Bull Racing and has won multiple championships?', ['Max Verstappen','Lewis Hamilton','Charles Leclerc','Lando Norris'], 0, 'formula1', '3', 'medium'),
  q('Which team has the most Constructors\' Championships in F1 history?', ['Ferrari','McLaren','Red Bull','Mercedes'], 0, 'formula1', '3', 'medium'),

  // Grade 4 — Medium
  q('How many points does a driver earn for winning a race?', ['25','10','20','15'], 0, 'formula1', '4', 'medium'),
  q('What is a "pit stop" in Formula 1?', ['When a car pulls off the track to change tyres and refuel','A traffic stop','A crash stop','A penalty stop'], 0, 'formula1', '4', 'medium'),
  q('Which engine manufacturer has powered the most F1 World Champions?', ['Ferrari','Mercedes','Honda','Renault'], 0, 'formula1', '4', 'medium'),

  // Grade 4 — Hard
  q('Which circuit is known as "The Temple of Speed" due to its high-speed layout?', ['Monza (Italy)','Silverstone (UK)','Suzuka (Japan)','Spa (Belgium)'], 0, 'formula1', '4', 'hard'),

  // Grade 5 — Medium
  q('Lewis Hamilton won how many F1 World Championships?', ['7','5','6','8'], 0, 'formula1', '5', 'medium'),
  q('What does "DRS" stand for in Formula 1?', ['Drag Reduction System','Driver Response Speed','Dynamic Race Strategy','Dual Rotation System'], 0, 'formula1', '5', 'medium'),

  // Grade 5 — Hard
  q('Ayrton Senna won his first F1 championship driving for which team?', ['McLaren','Lotus','Williams','Ferrari'], 0, 'formula1', '5', 'hard'),
  q('Which driver holds the record for most pole positions?', ['Ayrton Senna','Lewis Hamilton','Michael Schumacher','Sebastian Vettel'], 1, 'formula1', '5', 'hard'),

  // Grade 6 — Medium
  q('The Formula 1 season begins in which month typically?', ['March','January','May','September'], 0, 'formula1', '6', 'medium'),
  q('What material are most Formula 1 car bodies made from?', ['Carbon fibre','Aluminium','Steel','Titanium'], 0, 'formula1', '6', 'medium'),

  // Grade 6 — Hard
  q('Who was the youngest F1 World Champion in history at the time of his first title (2010)?', ['Sebastian Vettel','Max Verstappen','Lewis Hamilton','Fernando Alonso'], 0, 'formula1', '6', 'hard'),
  q('Which Grand Prix is held on a street circuit through a city famous for its casino?', ['Monaco','Singapore','Azerbaijan','Las Vegas'], 0, 'formula1', '6', 'hard'),
];

// ─── BASKETBALL ───────────────────────────────────────────────────────────────

const basketball: SeedQ[] = [
  // Grade 1 — Easy
  q('How do you score points in basketball?', ['Put the ball through the hoop','Kick it into a net','Hit it with a bat','Throw it over a net'], 0, 'basketball', '1', 'easy'),
  q('A normal basket is worth how many points?', ['2','1','3','4'], 0, 'basketball', '1', 'easy'),
  q('How many players does each basketball team have on the court?', ['5','6','4','7'], 0, 'basketball', '1', 'easy'),

  // Grade 2 — Easy
  q('What is a "free throw"?', ['An uncontested shot from the free-throw line after a foul','A throw-in from the sideline','A pass to a teammate','A jump shot'], 0, 'basketball', '2', 'easy'),
  q('Which NBA team is from Los Angeles and is nicknamed "the Lakers"?', ['LA Lakers','LA Clippers','LA Rams','LA Dodgers'], 0, 'basketball', '2', 'easy'),
  q('A shot made from behind the three-point line is worth how many points?', ['3','2','4','1'], 0, 'basketball', '2', 'easy'),

  // Grade 3 — Easy
  q('Which Lebanese club is one of the most successful in Lebanese basketball?', ['Sagesse','Riyadi','Hoops','Champville'], 0, 'basketball', '3', 'easy'),
  q('Who is considered the greatest basketball player of all time by many fans?', ['Michael Jordan','LeBron James','Kobe Bryant','Shaquille O\'Neal'], 0, 'basketball', '3', 'easy'),

  // Grade 3 — Medium
  q('The NBA Finals are played between the champions of which two conferences?', ['Eastern and Western','Northern and Southern','Atlantic and Pacific','American and National'], 0, 'basketball', '3', 'medium'),
  q('How long is a quarter in NBA basketball?', ['12 minutes','10 minutes','15 minutes','8 minutes'], 0, 'basketball', '3', 'medium'),

  // Grade 4 — Medium
  q('Which country is basketball originally from?', ['United States (Canada-born inventor)','Brazil','China','France'], 0, 'basketball', '4', 'medium'),
  q('Who invented the sport of basketball?', ['James Naismith','Michael Jordan','Dr. J (Julius Erving)','Larry Bird'], 0, 'basketball', '4', 'medium'),
  q('Sagesse Basketball Club is based in which Lebanese city?', ['Beirut','Tripoli','Sidon','Jounieh'], 0, 'basketball', '4', 'medium'),

  // Grade 4 — Hard
  q('How many championships did Michael Jordan win with the Chicago Bulls?', ['6','5','4','7'], 0, 'basketball', '4', 'hard'),

  // Grade 5 — Medium
  q('Which NBA team has the most championships in history?', ['Boston Celtics','Los Angeles Lakers','Chicago Bulls','Golden State Warriors'], 0, 'basketball', '5', 'medium'),
  q('What does "MVP" stand for in basketball?', ['Most Valuable Player','Most Victorious Player','Most Versatile Player','Main Valued Player'], 0, 'basketball', '5', 'medium'),

  // Grade 5 — Hard
  q('Lebanon first qualified for the FIBA Basketball World Cup in which year?', ['2010','2002','2014','2018'], 0, 'basketball', '5', 'hard'),
  q('LeBron James surpassed whose record to become the NBA all-time leading scorer?', ['Kareem Abdul-Jabbar','Michael Jordan','Kobe Bryant','Karl Malone'], 0, 'basketball', '5', 'hard'),

  // Grade 6 — Medium
  q('The Lebanese National Basketball team is nicknamed what?', ['The Cedars','The Eagles','The Lions','The Panthers'], 0, 'basketball', '6', 'medium'),
  q('How many titles has Sagesse BC won in Lebanese Basketball (approximately as of 2024)?', ['More than 20','5','10','15'], 0, 'basketball', '6', 'medium'),

  // Grade 6 — Hard
  q('Wilt Chamberlain scored how many points in a single NBA game in 1962?', ['100','82','73','89'], 0, 'basketball', '6', 'hard'),
  q('Which FIBA zone does Lebanon compete in for international basketball?', ['FIBA Asia','FIBA Africa','FIBA Europe','FIBA Americas'], 0, 'basketball', '6', 'hard'),
];

// ─── Export ───────────────────────────────────────────────────────────────────

export const TRIVIA_SEED: SeedQ[] = [
  ...history,
  ...sls,
  ...math,
  ...languages,
  ...football,
  ...formula1,
  ...basketball,
];
