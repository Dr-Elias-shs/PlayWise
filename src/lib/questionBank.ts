import { RoomKey } from '@/store/useWorldStore';

export type QuestionLevel = 'easy' | 'medium' | 'hard';

export interface LeveledQuestion {
  text: string;
  choices: string[];
  answer: number;
  level: QuestionLevel;
}

export const QUESTION_BANK: Record<RoomKey, LeveledQuestion[]> = {
  math: [
    // Easy
    { level: 'easy', text: 'What is 5 + 3?', choices: ['7', '8', '9', '10'], answer: 1 },
    { level: 'easy', text: 'What is 10 - 4?', choices: ['5', '6', '7', '4'], answer: 1 },
    { level: 'easy', text: 'What is 2 × 3?', choices: ['5', '6', '8', '4'], answer: 1 },
    // Medium
    { level: 'medium', text: 'What is 12 × 5?', choices: ['50', '60', '70', '55'], answer: 1 },
    { level: 'medium', text: 'What is 81 ÷ 9?', choices: ['7', '8', '9', '10'], answer: 2 },
    { level: 'medium', text: 'What is 45 + 27?', choices: ['62', '72', '82', '75'], answer: 1 },
    // Hard
    { level: 'hard', text: 'What is 15 × 13?', choices: ['185', '195', '205', '175'], answer: 1 },
    { level: 'hard', text: 'What is 256 ÷ 16?', choices: ['14', '18', '16', '12'], answer: 2 },
    { level: 'hard', text: 'What is 125 - 68?', choices: ['57', '67', '47', '55'], answer: 0 },
  ],
  science: [
    // Easy
    { level: 'easy', text: 'Which planet do we live on?', choices: ['Mars', 'Jupiter', 'Earth', 'Venus'], answer: 2 },
    { level: 'easy', text: 'What do bees make?', choices: ['Milk', 'Honey', 'Juice', 'Water'], answer: 1 },
    // Medium
    { level: 'medium', text: 'What state of matter is water?', choices: ['Solid', 'Liquid', 'Gas', 'Plasma'], answer: 1 },
    { level: 'medium', text: 'Which organ pumps blood?', choices: ['Lungs', 'Brain', 'Heart', 'Stomach'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is the closest star to Earth?', choices: ['Proxima Centauri', 'The Sun', 'Sirius', 'North Star'], answer: 1 },
    { level: 'hard', text: 'What process do plants use to make food?', choices: ['Respiration', 'Digestion', 'Photosynthesis', 'Evaporation'], answer: 2 },
  ],
  computer: [
    // Easy
    { level: 'easy', text: 'What do you use to type on a computer?', choices: ['Mouse', 'Monitor', 'Keyboard', 'Speaker'], answer: 2 },
    { level: 'easy', text: 'Which one is a portable computer?', choices: ['Desktop', 'Laptop', 'Server', 'Mainframe'], answer: 1 },
    // Medium
    { level: 'medium', text: 'What does RAM stand for?', choices: ['Read Access Memory', 'Random Access Memory', 'Rapid Access Memory', 'Real Access Memory'], answer: 1 },
    { level: 'medium', text: 'Which one is an operating system?', choices: ['Google', 'Facebook', 'Windows', 'Intel'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is the main circuit board of a computer called?', choices: ['Hard Drive', 'Motherboard', 'CPU', 'Power Supply'], answer: 1 },
    { level: 'hard', text: 'What does HTML stand for?', choices: ['HyperText Markup Language', 'HighText Machine Language', 'HyperText Mixed Language', 'HyperText Main Language'], answer: 0 },
  ],
  robotics: [
    // Easy
    { level: 'easy', text: 'What powers most small robots?', choices: ['Steam', 'Batteries', 'Food', 'Wind'], answer: 1 },
    { level: 'easy', text: 'A robot is a machine that can...', choices: ['Only talk', 'Only walk', 'Perform tasks automatically', 'Only see'], answer: 2 },
    // Medium
    { level: 'medium', text: 'Which part of a robot acts like its brain?', choices: ['Battery', 'Sensor', 'Microcontroller', 'Motor'], answer: 2 },
    { level: 'medium', text: 'What does a sensor help a robot do?', choices: ['Move', 'Think', 'Perceive its environment', 'Charge'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is the name for the study of robots?', choices: ['Mechanics', 'Robotics', 'Electronics', 'Physics'], answer: 1 },
    { level: 'hard', text: 'Which of these is used to program a robot?', choices: ['A hammer', 'Code', 'A screwdriver', 'Paint'], answer: 1 },
  ],
  library: [
    // Easy
    { level: 'easy', text: 'What is the person who writes a book called?', choices: ['Editor', 'Reader', 'Author', 'Painter'], answer: 2 },
    { level: 'easy', text: 'Where can you borrow books for free?', choices: ['Store', 'Bakery', 'Library', 'Cinema'], answer: 2 },
    // Medium
    { level: 'medium', text: 'What is a book about a person\'s life called?', choices: ['Fiction', 'Biography', 'Mystery', 'Poetry'], answer: 1 },
    { level: 'medium', text: 'What is the name of the list of chapters at the start of a book?', choices: ['Index', 'Glossary', 'Table of Contents', 'Appendix'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is a word that means the opposite of another word?', choices: ['Synonym', 'Homonym', 'Antonym', 'Acronym'], answer: 2 },
    { level: 'hard', text: 'What is the term for a story that is not true?', choices: ['Non-fiction', 'Biography', 'Fiction', 'Documentary'], answer: 2 },
  ],
  history: [
    // Easy
    { level: 'easy', text: 'What do we call the study of the past?', choices: ['Science', 'History', 'Art', 'Music'], answer: 1 },
    { level: 'easy', text: 'Which ancient people built the pyramids?', choices: ['Romans', 'Greeks', 'Egyptians', 'Vikings'], answer: 2 },
    // Medium
    { level: 'medium', text: 'Who was the first person to walk on the moon?', choices: ['Buzz Aldrin', 'Neil Armstrong', 'Yuri Gagarin', 'John Glenn'], answer: 1 },
    { level: 'medium', text: 'In which country did the Olympic Games begin?', choices: ['Italy', 'Egypt', 'Greece', 'China'], answer: 2 },
    // Hard
    { level: 'hard', text: 'Which document declared the USA free from Britain?', choices: ['The Constitution', 'Declaration of Independence', 'Bill of Rights', 'Magna Carta'], answer: 1 },
    { level: 'hard', text: 'Who was the famous queen of ancient Egypt?', choices: ['Cleopatra', 'Elizabeth', 'Victoria', 'Nefertiti'], answer: 0 },
  ],
  language_arts: [
    // Easy
    { level: 'easy', text: 'Which of these is a noun?', choices: ['Run', 'Happy', 'Dog', 'Fast'], answer: 2 },
    { level: 'easy', text: 'What comes at the end of a sentence?', choices: ['Comma', 'Punctuation mark', 'Space', 'Capital letter'], answer: 1 },
    // Medium
    { level: 'medium', text: 'Which word is a verb?', choices: ['Blue', 'Apple', 'Jump', 'Quickly'], answer: 2 },
    { level: 'medium', text: 'What is a word that describes a noun?', choices: ['Verb', 'Adverb', 'Adjective', 'Pronoun'], answer: 2 },
    // Hard
    { level: 'hard', text: 'Which of these is a compound word?', choices: ['Happy', 'Sunshine', 'Running', 'Little'], answer: 1 },
    { level: 'hard', text: 'What is a comparison using "like" or "as" called?', choices: ['Metaphor', 'Simile', 'Personification', 'Hyperbole'], answer: 1 },
  ],
  reading: [
    // Easy
    { level: 'easy', text: 'What is the title of a book?', choices: ['The author', 'The name of the book', 'The pictures', 'The price'], answer: 1 },
    { level: 'easy', text: 'What do you call the pictures in a book?', choices: ['Text', 'Illustrations', 'Graphs', 'Maps'], answer: 1 },
    // Medium
    { level: 'medium', text: 'What is a "fable"?', choices: ['A true story', 'A story with a moral/lesson', 'A map', 'A poem'], answer: 1 },
    { level: 'medium', text: 'What part of a book tells you the meaning of hard words?', choices: ['Index', 'Preface', 'Glossary', 'Cover'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is "alliteration"?', choices: ['Rhyming words', 'Repeating the same first letter sound', 'Short stories', 'Type of paper'], answer: 1 },
    { level: 'hard', text: 'What is the perspective from which a story is told?', choices: ['Plot', 'Theme', 'Point of view', 'Setting'], answer: 2 },
  ],
  art: [
    // Easy
    { level: 'easy', text: 'Which color do you get by mixing red and yellow?', choices: ['Green', 'Purple', 'Orange', 'Brown'], answer: 2 },
    { level: 'easy', text: 'What do you use to cut paper?', choices: ['Glue', 'Pencil', 'Scissors', 'Eraser'], answer: 2 },
    // Medium
    { level: 'medium', text: 'What are the three primary colors?', choices: ['Red, Blue, Green', 'Red, Yellow, Blue', 'Orange, Purple, Green', 'Pink, Cyan, Lime'], answer: 1 },
    { level: 'medium', text: 'What is a painting of a person called?', choices: ['Landscape', 'Still life', 'Portrait', 'Abstract'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is the term for the lightness or darkness of a color?', choices: ['Hue', 'Value', 'Intensity', 'Texture'], answer: 1 },
    { level: 'hard', text: 'Which artist is famous for painting the Mona Lisa?', choices: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Claude Monet'], answer: 2 },
  ],
  music: [
    // Easy
    { level: 'easy', text: 'Which instrument has black and white keys?', choices: ['Guitar', 'Drum', 'Piano', 'Flute'], answer: 2 },
    { level: 'easy', text: 'What do you use to sing?', choices: ['Hands', 'Feet', 'Voice', 'Ears'], answer: 2 },
    // Medium
    { level: 'medium', text: 'How many lines are on a musical staff?', choices: ['4', '5', '6', '3'], answer: 1 },
    { level: 'medium', text: 'Which instrument is part of the brass family?', choices: ['Violin', 'Clarinet', 'Trumpet', 'Harp'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What does "piano" mean in music terms?', choices: ['Fast', 'Slow', 'Soft', 'Loud'], answer: 2 },
    { level: 'hard', text: 'Who composed the "Fifth Symphony"?', choices: ['Mozart', 'Beethoven', 'Bach', 'Chopin'], answer: 1 },
  ],
  kitchen: [
    // Easy
    { level: 'easy', text: 'Which fruit is usually red or green?', choices: ['Banana', 'Apple', 'Orange', 'Grapefruit'], answer: 1 },
    { level: 'easy', text: 'What do you use to eat soup?', choices: ['Fork', 'Knife', 'Spoon', 'Toothpick'], answer: 2 },
    // Medium
    { level: 'medium', text: 'Which ingredient makes bread rise?', choices: ['Salt', 'Sugar', 'Yeast', 'Butter'], answer: 2 },
    { level: 'medium', text: 'What is the main ingredient in an omelette?', choices: ['Milk', 'Flour', 'Eggs', 'Cheese'], answer: 2 },
    // Hard
    { level: 'hard', text: 'What is the process of heating sugar until it turns brown?', choices: ['Boiling', 'Caramelizing', 'Frying', 'Baking'], answer: 1 },
    { level: 'hard', text: 'Which of these is a root vegetable?', choices: ['Broccoli', 'Spinach', 'Carrot', 'Tomato'], answer: 2 },
  ],
  cafeteria: [
    // Easy
    { level: 'easy', text: 'What do you usually drink to keep your bones strong?', choices: ['Soda', 'Water', 'Milk', 'Coffee'], answer: 2 },
    { level: 'easy', text: 'Which of these is a vegetable?', choices: ['Strawberry', 'Chicken', 'Carrot', 'Bread'], answer: 2 },
    // Medium
    { level: 'medium', text: 'How many servings of fruits and vegetables are recommended daily?', choices: ['1-2', '3-4', '5+', '10'], answer: 2 },
    { level: 'medium', text: 'Which food is a good source of protein?', choices: ['Apple', 'Chicken', 'Rice', 'Cucumber'], answer: 1 },
    // Hard
    { level: 'hard', text: 'Which nutrient is the body\'s main source of energy?', choices: ['Protein', 'Fiber', 'Carbohydrates', 'Vitamins'], answer: 2 },
    { level: 'hard', text: 'Which organ helps digest your food?', choices: ['Heart', 'Lungs', 'Stomach', 'Brain'], answer: 2 },
  ],
};
