import { RoomKey } from '@/store/useWorldStore';

export type QuestionLevel = 'easy' | 'medium' | 'hard';

export interface LeveledQuestion {
  text:         string;
  choices:      string[];
  answer:       number;
  level:        QuestionLevel;
  explanation?: string;
}

export const QUESTION_BANK: Record<RoomKey, LeveledQuestion[]> = {
  math: [
    { level: 'easy',   text: 'What is 5 + 3?',    choices: ['7', '8', '9', '10'], answer: 1, explanation: '5 + 3 = 8. Count 5 fingers, then add 3 more — you get 8!' },
    { level: 'easy',   text: 'What is 10 - 4?',   choices: ['5', '6', '7', '4'],  answer: 1, explanation: '10 − 4 = 6. Start at 10, take away 4 steps: 9, 8, 7, 6.' },
    { level: 'easy',   text: 'What is 2 × 3?',    choices: ['5', '6', '8', '4'],  answer: 1, explanation: '2 × 3 means 2 groups of 3: 3 + 3 = 6.' },
    { level: 'medium', text: 'What is 12 × 5?',   choices: ['50', '60', '70', '55'], answer: 1, explanation: '12 × 5 = 60. Think: 10×5=50 plus 2×5=10, so 50+10=60.' },
    { level: 'medium', text: 'What is 81 ÷ 9?',   choices: ['7', '8', '9', '10'],  answer: 2, explanation: '81 ÷ 9 = 9 because 9 × 9 = 81. It\'s the 9 times table!' },
    { level: 'medium', text: 'What is 45 + 27?',  choices: ['62', '72', '82', '75'], answer: 1, explanation: '45 + 27: add the tens (40+20=60), add the units (5+7=12), total = 72.' },
    { level: 'hard',   text: 'What is 15 × 13?',  choices: ['185', '195', '205', '175'], answer: 1, explanation: '15 × 13 = 15 × 10 + 15 × 3 = 150 + 45 = 195.' },
    { level: 'hard',   text: 'What is 256 ÷ 16?', choices: ['14', '18', '16', '12'],    answer: 2, explanation: '256 ÷ 16 = 16, because 16 × 16 = 256.' },
    { level: 'hard',   text: 'What is 125 - 68?', choices: ['57', '67', '47', '55'],    answer: 0, explanation: '125 − 68: 125 − 70 = 55, then add back 2 = 57.' },
  ],
  science: [
    { level: 'easy',   text: 'Which planet do we live on?',          choices: ['Mars', 'Jupiter', 'Earth', 'Venus'],   answer: 2, explanation: 'We live on Earth — the third planet from the Sun and the only one known to support life.' },
    { level: 'easy',   text: 'What do bees make?',                   choices: ['Milk', 'Honey', 'Juice', 'Water'],     answer: 1, explanation: 'Bees collect nectar from flowers and turn it into honey inside the hive.' },
    { level: 'medium', text: 'What state of matter is water?',       choices: ['Solid', 'Liquid', 'Gas', 'Plasma'],    answer: 1, explanation: 'At room temperature, water is a liquid. It becomes solid (ice) when frozen, and gas (steam) when boiled.' },
    { level: 'medium', text: 'Which organ pumps blood?',             choices: ['Lungs', 'Brain', 'Heart', 'Stomach'],  answer: 2, explanation: 'The heart is a muscle that pumps blood through your body non-stop, about 100,000 times a day!' },
    { level: 'hard',   text: 'What is the closest star to Earth?',   choices: ['Proxima Centauri', 'The Sun', 'Sirius', 'North Star'], answer: 1, explanation: 'The Sun is our star — only 150 million km away. Proxima Centauri is the next closest at 4.2 light-years.' },
    { level: 'hard',   text: 'What process do plants use to make food?', choices: ['Respiration', 'Digestion', 'Photosynthesis', 'Evaporation'], answer: 2, explanation: 'Photosynthesis: plants use sunlight + water + CO₂ to produce glucose (food) and release oxygen.' },
  ],
  computer: [
    { level: 'easy',   text: 'What do you use to type on a computer?',    choices: ['Mouse', 'Monitor', 'Keyboard', 'Speaker'], answer: 2, explanation: 'The keyboard has keys for letters, numbers, and symbols — you press them to type.' },
    { level: 'easy',   text: 'Which one is a portable computer?',         choices: ['Desktop', 'Laptop', 'Server', 'Mainframe'], answer: 1, explanation: 'A laptop has a built-in screen and battery — you can carry it anywhere.' },
    { level: 'medium', text: 'What does RAM stand for?',                  choices: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Memory', 'Real Access Memory'], answer: 1, explanation: 'RAM = Random Access Memory. It\'s the computer\'s short-term memory used while programs are running.' },
    { level: 'medium', text: 'Which one is an operating system?',         choices: ['Google', 'Facebook', 'Windows', 'Intel'],    answer: 2, explanation: 'Windows (by Microsoft) is an OS — software that manages hardware and lets you run other programs.' },
    { level: 'hard',   text: 'What is the main circuit board called?',    choices: ['Hard Drive', 'Motherboard', 'CPU', 'Power Supply'], answer: 1, explanation: 'The motherboard connects all components — CPU, RAM, storage — like the backbone of the computer.' },
    { level: 'hard',   text: 'What does HTML stand for?',                choices: ['HyperText Markup Language', 'HighText Machine Language', 'HyperText Mixed Language', 'HyperText Main Language'], answer: 0, explanation: 'HTML = HyperText Markup Language. It\'s the code that builds the structure of every web page.' },
  ],
  robotics: [
    { level: 'easy',   text: 'What powers most small robots?',                choices: ['Steam', 'Batteries', 'Food', 'Wind'],           answer: 1, explanation: 'Batteries store electrical energy that powers a robot\'s motors and circuits.' },
    { level: 'easy',   text: 'A robot is a machine that can...',              choices: ['Only talk', 'Only walk', 'Perform tasks automatically', 'Only see'], answer: 2, explanation: 'Robots are programmed to perform tasks automatically, without needing a human to do every step.' },
    { level: 'medium', text: 'Which part of a robot acts like its brain?',   choices: ['Battery', 'Sensor', 'Microcontroller', 'Motor'],  answer: 2, explanation: 'A microcontroller is a tiny computer chip that runs the robot\'s program and makes decisions.' },
    { level: 'medium', text: 'What does a sensor help a robot do?',          choices: ['Move', 'Think', 'Perceive its environment', 'Charge'], answer: 2, explanation: 'Sensors detect things like light, distance, or touch — giving the robot information about its surroundings.' },
    { level: 'hard',   text: 'What is the study of robots called?',          choices: ['Mechanics', 'Robotics', 'Electronics', 'Physics'], answer: 1, explanation: 'Robotics combines engineering, computer science, and mechanics to design and build robots.' },
    { level: 'hard',   text: 'Which of these is used to program a robot?',   choices: ['A hammer', 'Code', 'A screwdriver', 'Paint'],      answer: 1, explanation: 'Code (programming language) gives the robot step-by-step instructions that tell it what to do.' },
  ],
  library: [
    { level: 'easy',   text: 'What is the person who writes a book called?',          choices: ['Editor', 'Reader', 'Author', 'Painter'],      answer: 2, explanation: 'The author writes the book. The editor helps improve it, but the author creates the story.' },
    { level: 'easy',   text: 'Where can you borrow books for free?',                  choices: ['Store', 'Bakery', 'Library', 'Cinema'],        answer: 2, explanation: 'Libraries lend books (and more!) for free — you just need a library card.' },
    { level: 'medium', text: 'What is a book about a person\'s life called?',         choices: ['Fiction', 'Biography', 'Mystery', 'Poetry'],   answer: 1, explanation: 'A biography tells the true story of a real person\'s life. If they wrote it themselves, it\'s an autobiography.' },
    { level: 'medium', text: 'What is the list of chapters at the start of a book?', choices: ['Index', 'Glossary', 'Table of Contents', 'Appendix'], answer: 2, explanation: 'The Table of Contents lists all chapters and their page numbers so you can navigate the book easily.' },
    { level: 'hard',   text: 'What is a word meaning the opposite of another?',       choices: ['Synonym', 'Homonym', 'Antonym', 'Acronym'],    answer: 2, explanation: '"Hot" and "cold" are antonyms. A synonym is a word with a similar meaning (big/large).' },
    { level: 'hard',   text: 'What is a story that is not true called?',              choices: ['Non-fiction', 'Biography', 'Fiction', 'Documentary'], answer: 2, explanation: 'Fiction is made-up stories. Non-fiction is based on real events or facts.' },
  ],
  history: [
    { level: 'easy',   text: 'What do we call the study of the past?',                choices: ['Science', 'History', 'Art', 'Music'],            answer: 1, explanation: 'History is the study of past events. Historians research records, artifacts, and documents.' },
    { level: 'easy',   text: 'Which ancient people built the pyramids?',               choices: ['Romans', 'Greeks', 'Egyptians', 'Vikings'],       answer: 2, explanation: 'The ancient Egyptians built the pyramids as tombs for their pharaohs, over 4,000 years ago.' },
    { level: 'medium', text: 'Who was the first person to walk on the moon?',         choices: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'], answer: 1, explanation: 'Neil Armstrong stepped on the Moon on July 20, 1969, during NASA\'s Apollo 11 mission.' },
    { level: 'medium', text: 'In which country did the Olympic Games begin?',         choices: ['Italy', 'Egypt', 'Greece', 'China'],              answer: 2, explanation: 'The ancient Olympics started in Olympia, Greece, around 776 BC. The modern Olympics began in Athens in 1896.' },
    { level: 'hard',   text: 'Which document declared the USA free from Britain?',   choices: ['The Constitution', 'Declaration of Independence', 'Bill of Rights', 'Magna Carta'], answer: 1, explanation: 'The Declaration of Independence was signed on July 4, 1776 — now celebrated as Independence Day.' },
    { level: 'hard',   text: 'Who was the famous queen of ancient Egypt?',            choices: ['Cleopatra', 'Elizabeth', 'Victoria', 'Nefertiti'], answer: 0, explanation: 'Cleopatra VII was the last active ruler of ancient Egypt, known for her intelligence and political alliances.' },
  ],
  language_arts: [
    { level: 'easy',   text: 'Which of these is a noun?',                       choices: ['Run', 'Happy', 'Dog', 'Fast'],        answer: 2, explanation: 'A noun is a person, place, or thing. "Dog" is a thing. "Run" is a verb, "happy" and "fast" are adjectives/adverbs.' },
    { level: 'easy',   text: 'What comes at the end of a sentence?',            choices: ['Comma', 'Punctuation mark', 'Space', 'Capital letter'], answer: 1, explanation: 'Every sentence ends with a punctuation mark — a period (.), question mark (?), or exclamation mark (!).' },
    { level: 'medium', text: 'Which word is a verb?',                           choices: ['Blue', 'Apple', 'Jump', 'Quickly'],   answer: 2, explanation: 'A verb is an action or state. "Jump" is an action. "Blue" is an adjective, "apple" a noun, "quickly" an adverb.' },
    { level: 'medium', text: 'What is a word that describes a noun?',           choices: ['Verb', 'Adverb', 'Adjective', 'Pronoun'], answer: 2, explanation: 'Adjectives describe nouns: "the tall tree", "a red car". Adverbs describe verbs.' },
    { level: 'hard',   text: 'Which of these is a compound word?',              choices: ['Happy', 'Sunshine', 'Running', 'Little'], answer: 1, explanation: '"Sunshine" = sun + shine, two words joined into one. Compound words combine two complete words.' },
    { level: 'hard',   text: 'What is a comparison using "like" or "as" called?', choices: ['Metaphor', 'Simile', 'Personification', 'Hyperbole'], answer: 1, explanation: '"Fast as a cheetah" is a simile. A metaphor says something IS something else: "He is a lion."' },
  ],
  reading: [
    { level: 'easy',   text: 'What is the title of a book?',                    choices: ['The author', 'The name of the book', 'The pictures', 'The price'], answer: 1, explanation: 'The title is the official name of the book, shown on its cover.' },
    { level: 'easy',   text: 'What do you call the pictures in a book?',        choices: ['Text', 'Illustrations', 'Graphs', 'Maps'],    answer: 1, explanation: 'Illustrations are artistic pictures drawn or painted to support the story.' },
    { level: 'medium', text: 'What is a "fable"?',                              choices: ['A true story', 'A story with a moral/lesson', 'A map', 'A poem'], answer: 1, explanation: 'A fable is a short story — often with animal characters — that ends with a moral lesson (e.g. Aesop\'s fables).' },
    { level: 'medium', text: 'What part of a book tells the meaning of hard words?', choices: ['Index', 'Preface', 'Glossary', 'Cover'], answer: 2, explanation: 'The glossary is a mini-dictionary at the back of the book explaining difficult terms.' },
    { level: 'hard',   text: 'What is "alliteration"?',                         choices: ['Rhyming words', 'Repeating the same first letter sound', 'Short stories', 'Type of paper'], answer: 1, explanation: '"Peter Piper picked a peck of pickled peppers" — every key word starts with P. That\'s alliteration.' },
    { level: 'hard',   text: 'What is the perspective from which a story is told?', choices: ['Plot', 'Theme', 'Point of view', 'Setting'], answer: 2, explanation: 'Point of view = who tells the story. First person uses "I"; third person uses "he/she/they".' },
  ],
  art: [
    { level: 'easy',   text: 'Which color do you get by mixing red and yellow?',   choices: ['Green', 'Purple', 'Orange', 'Brown'],  answer: 2, explanation: 'Red + yellow = orange. Red + blue = purple. Blue + yellow = green.' },
    { level: 'easy',   text: 'What do you use to cut paper?',                      choices: ['Glue', 'Pencil', 'Scissors', 'Eraser'], answer: 2, explanation: 'Scissors have two sharp blades that slide past each other to cut material like paper or fabric.' },
    { level: 'medium', text: 'What are the three primary colors?',                 choices: ['Red, Blue, Green', 'Red, Yellow, Blue', 'Orange, Purple, Green', 'Pink, Cyan, Lime'], answer: 1, explanation: 'Primary colors (red, yellow, blue) cannot be made by mixing others. All other colors come from them.' },
    { level: 'medium', text: 'What is a painting of a person called?',             choices: ['Landscape', 'Still life', 'Portrait', 'Abstract'], answer: 2, explanation: 'A portrait focuses on a person\'s face and expression. A landscape shows scenery; still life shows objects.' },
    { level: 'hard',   text: 'What is the term for the lightness or darkness of a color?', choices: ['Hue', 'Value', 'Intensity', 'Texture'], answer: 1, explanation: 'Value refers to how light or dark a color is. Adding white creates a tint; adding black creates a shade.' },
    { level: 'hard',   text: 'Who painted the Mona Lisa?',                         choices: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'], answer: 2, explanation: 'Leonardo da Vinci painted the Mona Lisa around 1503–1519. It now hangs in the Louvre Museum, Paris.' },
  ],
  music: [
    { level: 'easy',   text: 'Which instrument has black and white keys?',     choices: ['Guitar', 'Drum', 'Piano', 'Flute'],     answer: 2, explanation: 'The piano has 88 keys — 52 white and 36 black. Pressing a key strikes a string inside to make sound.' },
    { level: 'easy',   text: 'What do you use to sing?',                       choices: ['Hands', 'Feet', 'Voice', 'Ears'],       answer: 2, explanation: 'Singing uses your voice — air from the lungs vibrates your vocal cords to produce musical sound.' },
    { level: 'medium', text: 'How many lines are on a musical staff?',         choices: ['4', '5', '6', '3'],                    answer: 1, explanation: 'A musical staff has exactly 5 horizontal lines. Notes sit on or between these lines to show their pitch.' },
    { level: 'medium', text: 'Which instrument is part of the brass family?', choices: ['Violin', 'Clarinet', 'Trumpet', 'Harp'], answer: 2, explanation: 'The trumpet is brass — you buzz your lips into a metal mouthpiece. Clarinet is woodwind; violin is strings.' },
    { level: 'hard',   text: 'What does "piano" mean in music terms?',        choices: ['Fast', 'Slow', 'Soft', 'Loud'],         answer: 2, explanation: '"Piano" means soft/quiet in Italian musical notation. "Forte" means loud. "Forte-piano" = the instrument!' },
    { level: 'hard',   text: 'Who composed the "Fifth Symphony"?',            choices: ['Mozart', 'Beethoven', 'Bach', 'Chopin'], answer: 1, explanation: 'Beethoven\'s Fifth Symphony (1808) opens with the famous "da-da-da-DUM" motif — one of the most recognised in classical music.' },
  ],
  kitchen: [
    { level: 'easy',   text: 'Which fruit is usually red or green?',             choices: ['Banana', 'Apple', 'Orange', 'Grapefruit'],  answer: 1, explanation: 'Apples come in many colours — red (like Gala), green (like Granny Smith), and even yellow.' },
    { level: 'easy',   text: 'What do you use to eat soup?',                     choices: ['Fork', 'Knife', 'Spoon', 'Toothpick'],      answer: 2, explanation: 'A spoon\'s bowl-shaped head is perfect for scooping liquid foods like soup.' },
    { level: 'medium', text: 'Which ingredient makes bread rise?',               choices: ['Salt', 'Sugar', 'Yeast', 'Butter'],         answer: 2, explanation: 'Yeast is a living organism that eats sugar and releases CO₂ gas — those bubbles make bread dough puff up.' },
    { level: 'medium', text: 'What is the main ingredient in an omelette?',      choices: ['Milk', 'Flour', 'Eggs', 'Cheese'],          answer: 2, explanation: 'An omelette is made primarily of beaten eggs cooked in a pan. Other ingredients are optional fillings.' },
    { level: 'hard',   text: 'What is the process of heating sugar until brown?', choices: ['Boiling', 'Caramelizing', 'Frying', 'Baking'], answer: 1, explanation: 'Caramelizing = heating sugar until it melts and turns brown, creating a rich, sweet flavour used in desserts.' },
    { level: 'hard',   text: 'Which of these is a root vegetable?',              choices: ['Broccoli', 'Spinach', 'Carrot', 'Tomato'],  answer: 2, explanation: 'Carrots grow underground as the plant\'s root. Broccoli and spinach are above-ground; tomato is a fruit.' },
  ],
  cafeteria: [
    { level: 'easy',   text: 'What drink keeps your bones strong?',                choices: ['Soda', 'Water', 'Milk', 'Coffee'],            answer: 2, explanation: 'Milk is rich in calcium, which builds and maintains strong bones and teeth.' },
    { level: 'easy',   text: 'Which of these is a vegetable?',                    choices: ['Strawberry', 'Chicken', 'Carrot', 'Bread'],   answer: 2, explanation: 'Carrots are vegetables — they grow underground and are packed with vitamin A.' },
    { level: 'medium', text: 'How many servings of fruits and vegetables daily?', choices: ['1-2', '3-4', '5+', '10'],                     answer: 2, explanation: 'Health guidelines recommend at least 5 servings of fruits and vegetables a day for a balanced diet.' },
    { level: 'medium', text: 'Which food is a good source of protein?',           choices: ['Apple', 'Chicken', 'Rice', 'Cucumber'],       answer: 1, explanation: 'Chicken is rich in protein, which your body uses to build and repair muscles and tissues.' },
    { level: 'hard',   text: 'Which nutrient is the body\'s main energy source?', choices: ['Protein', 'Fiber', 'Carbohydrates', 'Vitamins'], answer: 2, explanation: 'Carbohydrates (bread, pasta, rice) are broken down into glucose — the body\'s preferred fuel source.' },
    { level: 'hard',   text: 'Which organ helps digest your food?',               choices: ['Heart', 'Lungs', 'Stomach', 'Brain'],         answer: 2, explanation: 'The stomach uses acid and muscle contractions to break down food into smaller pieces for absorption.' },
  ],
};
