export const readingStarters = {
  spanish: {
    title: 'A Seat in the Sun',
    preview: 'A first visit to a neighborhood café in Valencia, with a few greetings to try out loud.',
    passages: [
      ['Es sábado por la mañana. Lucía entra en un café pequeño de Valencia. «Buenos días», dice al camarero.',
        'It is Saturday morning. Lucía walks into a small café in Valencia. “Good morning,” she says to the waiter.'],
      ['«Buenos días. ¿Qué te pongo?», pregunta él. «Un café con leche, por favor», dice Lucía. Luego mira por la ventana. Hay una mesa libre al sol.',
        '“Good morning. What can I get you?” he asks. “A coffee with milk, please,” says Lucía. Then she looks out the window. There is a free table in the sun.'],
      ['En la terraza, una vecina saluda a Lucía. «Hola, ¿qué tal?». «Muy bien, gracias. ¿Y tú?». La vecina sonríe y se sienta con ella.',
        'On the terrace, a neighbor greets Lucía. “Hi, how’s it going?” “Very well, thanks. And you?” The neighbor smiles and sits with her.']
    ],
    culturalContext: {
      country: 'Spain',
      backgroundInfo: 'A café terrace is a common place to meet a friend and sit outside over a coffee.',
      culturalTips: ['In the morning, try saying buenos días when you enter a small shop or café.'],
      learningPoints: ['Use ¿qué tal? to ask how someone is and ¿y tú? to return the question.']
    },
    vocabulary: [
      { word: 'buenos días', definition: 'good morning', pronunciation: 'BWEH-nos DEE-ahs', difficulty: 1, contextSentence: '«Buenos días», dice al camarero.' },
      { word: 'por favor', definition: 'please', pronunciation: 'por fah-VOR', difficulty: 1, contextSentence: 'Un café con leche, por favor.' }
    ],
    grammarPoints: [{ concept: 'Hay', explanation: 'Use hay to say that something is there.', examples: ['Hay una mesa libre.'] }],
    comprehensionQuestions: [{ question: 'What does Lucía order?', options: ['A coffee with milk', 'An orange juice', 'A cup of tea'],
      correctAnswer: 0, explanation: 'She asks for un café con leche, or a coffee with milk.' }]
  },
  japanese: {
    title: 'A Rainy Morning in Kyoto',
    preview: 'Follow Mina to a neighborhood bakery and practice everyday greetings along the way.',
    passages: [
      ['雨の朝です。ミナは京都の小さなパン屋に行きます。店の前で、となりの山田さんに会います。「おはようございます」とミナは言います。',
        'It is a rainy morning. Mina goes to a small bakery in Kyoto. Outside the shop, she meets her neighbor, Ms. Yamada. “Good morning,” Mina says.'],
      ['店の人は「いらっしゃいませ」と言います。ミナはパンを二つ見て、「これを二つください」と言います。',
        'The shopkeeper says, “Welcome.” Mina looks at two rolls and says, “Two of these, please.”'],
      ['店の人はパンを袋に入れます。「ありがとうございます」とミナは言います。外で、ミナは山田さんにパンを一つあげます。',
        'The shopkeeper puts the rolls in a bag. “Thank you very much,” Mina says. Outside, Mina gives one roll to Ms. Yamada.']
    ],
    culturalContext: {
      country: 'Japan',
      backgroundInfo: 'In a shop, staff often welcome customers with いらっしゃいませ (irasshaimase).',
      culturalTips: ['You can acknowledge the shop greeting with a small nod.'],
      learningPoints: ['Use おはようございます as a polite greeting in the morning.']
    },
    vocabulary: [
      { word: 'おはようございます', definition: 'good morning (polite)', pronunciation: 'ohayō gozaimasu', difficulty: 1, contextSentence: '「おはようございます」とミナは言います。' },
      { word: '二つ', definition: 'two items', pronunciation: 'futatsu', difficulty: 1, contextSentence: 'これを二つください。' }
    ],
    grammarPoints: [{ concept: 'ください', explanation: 'Use ください when asking politely for something.', examples: ['これを二つください。'] }],
    comprehensionQuestions: [{ question: 'How many rolls does Mina buy?', options: ['One', 'Two', 'Three'],
      correctAnswer: 1, explanation: 'Mina asks for 二つ (futatsu), which means two items.' }]
  }
};
