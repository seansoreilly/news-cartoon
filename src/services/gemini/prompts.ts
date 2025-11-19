import type { NewsArticle } from '../../types/news';
import type { CartoonConcept, ComicScript, ComicScriptPanel, ComicPanel } from '../../types/cartoon';
import { extractTextElements } from './parsers';

/**
 * Create bracket-formatted spelling: "HELLO" -> "[H] [E] [L] [L] [O]"
 */
const spellOutTextWithBrackets = (text: string): string => {
    return text.split('').map(char => `[${char}]`).join(' ');
};

const getExampleScriptJson = (panelCount: number): string => {
    const examples: Record<number, string> = {
        1: `[
{
  "panelNumber": 1,
  "newsContext": "Satirizing a tech company's announcement about relocating their data centers to avoid climate regulations, treating servers like migrating birds",
  "visualDescription": "Wide shot of the Australian outback under a bright blue sky with wispy clouds. A massive metallic computer server, shaped exactly like a migrating bird with wings spread wide, soars through the air heading south. The server-bird has blinking LED lights for eyes and USB ports along its wings. Below on the red desert ground, three confused kangaroos stand upright, their heads tilted back watching the strange sight. One kangaroo scratches its head, another shields its eyes from the sun, and the third has its mouth hanging open in bewilderment. A wooden signpost reading 'MELBOURNE' points left.",
  "visibleText": [{"type": "sign", "content": "MELBOURNE"}],
  "characters": ["kangaroos", "server-bird"],
  "setting": "Australian outback"
}
]`,

        2: `[
{
  "panelNumber": 1,
  "newsContext": "Referencing a politician's promise to reduce bureaucratic red tape while simultaneously creating more regulations",
  "visualDescription": "Medium shot of a middle-aged politician in a dark blue suit standing confidently behind a wooden podium. His chest is puffed out, chin raised high, and he has a broad, toothy grin. His arms are spread wide in a triumphant gesture. Behind him, a large banner reads 'TRUST ME' in bold red letters. Stage lights create dramatic shadows on his face. The podium has multiple microphones pointing toward him.",
  "visibleText": [{"type": "sign", "content": "TRUST ME"}],
  "characters": ["politician"],
  "setting": "podium stage"
},
{
  "panelNumber": 2,
  "newsContext": "The ironic result of the politician becoming trapped by their own bureaucratic policies",
  "visualDescription": "Same stage setting but now in complete chaos. The politician is completely wrapped from head to toe in bright red tape like a mummy, with only his panicked eyes visible. He's struggling to move, arms pinned to his sides, teetering dangerously on the podium. The 'TRUST ME' banner behind him is now torn and hanging crooked. Papers are scattered everywhere on the stage floor. A small caption bubble appears in the corner.",
  "visibleText": [{"type": "caption", "content": "OOPS"}],
  "characters": ["politician"],
  "setting": "same stage"
}
]`,

        3: `[
{
  "panelNumber": 1,
  "newsContext": "Mocking a tech company's announcement of making devices smaller and more 'user-friendly' while actually making them more complex",
  "visualDescription": "Wide shot of a sleek, modern product launch stage with purple lighting. A tech CEO in a black turtleneck and jeans stands center stage, holding up a comically tiny phone between his thumb and index finger like a precious gem. His face shows extreme pride with raised eyebrows and a confident smirk. The audience in the foreground consists of dozens of people leaning forward, squinting to see the microscopic device. Large screens on either side of the stage show magnified images of the tiny phone.",
  "visibleText": [{"type": "dialogue", "content": "REVOLUTIONARY!"}],
  "characters": ["CEO", "audience"],
  "setting": "product launch stage"
},
{
  "panelNumber": 2,
  "newsContext": "The product begins to reveal its true, overwhelming nature despite promises of simplicity",
  "visualDescription": "Close-up shot of the CEO's increasingly worried face as the phone in his hands has grown to the size of a large textbook. His eyes are wide with concern, sweat beads forming on his forehead. He's struggling to hold the rapidly expanding device with both hands now, his arms starting to shake from the weight. The phone continues to glow and pulse with an ominous light. His mouth is open in a silent gasp of horror.",
  "visibleText": [],
  "characters": ["CEO"],
  "setting": "stage"
},
{
  "panelNumber": 3,
  "newsContext": "The end result: technology that was supposed to help users actually burdens them",
  "visualDescription": "Street-level view showing a regular person in casual clothes completely flattened under a now building-sized phone that has crushed them into the pavement. Only their arms and legs stick out from underneath the massive device like a cartoon character. The giant phone's screen still displays the home screen with app icons the size of windows. Cracks spider-web across the street from the impact. A tiny 'HELP' sign on a stick pokes out from under the phone.",
  "visibleText": [{"type": "sign", "content": "HELP"}],
  "characters": ["user"],
  "setting": "street"
}
]`,

        4: `[
{
  "panelNumber": 1,
  "newsContext": "Depicting a politician announcing new economic policies despite not understanding basic economics",
  "visualDescription": "Medium shot of a disheveled politician at a podium, his hair messy and tie crooked. His face shows complete confusion with furrowed brows, squinted eyes darting left and right, and his mouth slightly agape. One hand scratches his head while the other grips the podium for support. Behind him, a professional campaign banner reads 'VOTE NOW' but is partially falling off the wall. Several advisors in the background have their faces buried in their hands.",
  "visibleText": [{"type": "sign", "content": "VOTE NOW"}],
  "characters": ["politician"],
  "setting": "podium"
},
{
  "panelNumber": 2,
  "newsContext": "The politician attempts to explain their policy using data they clearly don't understand",
  "visualDescription": "The politician now holds up a large economic chart with both hands, but it's completely upside down. The graph lines point downward where they should go up, and all the text is inverted. He has an enormous, proud smile on his face, completely oblivious to his mistake. His finger points enthusiastically at the wrong end of the chart. One advisor in the background is frantically gesturing to flip it, but the politician doesn't notice.",
  "visibleText": [{"type": "dialogue", "content": "IT WORKS!"}],
  "characters": ["politician"],
  "setting": "podium"
},
{
  "panelNumber": 3,
  "newsContext": "The public's collective reaction to the incompetent presentation",
  "visualDescription": "Wide shot of the packed audience, showing dozens of people simultaneously facepalming in perfect unison. Men in business suits, women in professional attire, young students, and elderly voters all have their palms pressed firmly against their faces. Some peek through their fingers in disbelief. A few have both hands on their faces. One person in the front row has dramatically thrown their head back in exasperation.",
  "visibleText": [{"type": "dialogue", "content": "REALLY?"}],
  "characters": ["crowd"],
  "setting": "audience area"
},
{
  "panelNumber": 4,
  "newsContext": "The politician remains blissfully unaware of their failure, celebrating their 'success'",
  "visualDescription": "Close-up of the politician back at the podium, now shrugging with both shoulders raised high, palms up, and wearing the biggest, most clueless grin imaginable. His eyes are closed in blissful ignorance. The upside-down chart lies forgotten on the podium. Confetti inexplicably falls around him as if he's celebrating. His tie is now completely undone and his hair is even messier than before.",
  "visibleText": [{"type": "caption", "content": "THE END"}],
  "characters": ["politician"],
  "setting": "podium"
}
]`,
    };

    return examples[panelCount] || examples[4];
};

export const buildConceptPrompt = (articles: NewsArticle[], location: string): string => {
    const headlines = articles
        .map((a) => {
            const desc = a.description || '';
            return `- ${a.title}\n  ${desc}`;
        })
        .join('\n');

    return `You are a brilliant editorial cartoonist specializing in VISUAL humor and sharp satire.

NEWS HEADLINES from ${location}:
${headlines}

COMEDY TECHNIQUE INSTRUCTIONS:
Generate 5 cartoon concepts using DIFFERENT comedy techniques from this list:

1. VISUAL PUN: Transform a key element into its literal visual representation
2. ROLE REVERSAL: Swap expected positions (e.g., computers interviewing humans for jobs)
3. EXAGGERATION: Take one aspect to absurd extremes (e.g., tiny problem shown as mountain)
4. JUXTAPOSITION: Place contrasting elements side by side for ironic effect
5. ANTHROPOMORPHISM: Give human traits to objects/concepts involved in the story
6. ANACHRONISM: Show modern problem in historical setting or vice versa
7. PERSPECTIVE SHIFT: Show from POV of unexpected character (the road's view of traffic)
8. SCALE INVERSION: Make important things tiny, trivial things enormous

REQUIREMENTS FOR EACH CONCEPT:
- Must be funny WITHOUT dialogue (visual gag primary)
- Should make viewers think "I never looked at it that way"
- Include specific visual details that enhance the humor
- Focus on IRONY and ABSURDITY, not just illustration
- Make it work as a SILENT film scene

AVOID:
- Concepts that require text to be funny
- Direct illustration without twist
- Offensive stereotypes
- Purely verbal puns

Generate exactly 5 concepts as JSON array with these fields:
- title: Catchy name for the cartoon
- premise: VISUAL description of what viewers will SEE (not read)
- why_funny: The comedic technique used and why it creates humor

Focus on SHOWING the absurdity, not telling it.`;
};

export const buildComicPrompt = (
    concept: CartoonConcept,
    articles: NewsArticle[],
    panelCount: number = 4
): string => {
    const news_section = articles.length > 0 ? `
NEWS STORIES BEING SATIRIZED:
${articles.slice(0, 3).map(a => `- ${a.title}\n  Summary: ${a.description || 'No description available'}`).join('\n')}
` : '';

    return `Create a DETAILED comic strip script with EXACTLY ${panelCount} panel${panelCount === 1 ? '' : 's'}.

CARTOON CONCEPT:
Title: ${concept.title}
Premise: ${concept.premise}
Why it's funny: ${concept.why_funny || 'Visual satire of current events'}
Setting: ${concept.location}

${news_section}

IMPORTANT: Your script MUST clearly connect to the news stories above. The first panel should establish the news context, then subsequent panels develop the satirical joke based on that context.

RESPOND WITH VALID JSON ONLY. No markdown, no explanation. Pure JSON array.

Format each panel as a JSON object with these EXACT fields:
{
  "panelNumber": 1,
  "newsContext": "Brief explanation of which news story/aspect is being satirized in this panel",
  "visualDescription": "DETAILED description of everything visible in the panel",
  "visibleText": [
    {"type": "sign", "content": "TEXT ON SIGN"},
    {"type": "dialogue", "content": "DIALOGUE"}
  ],
  "characters": ["list", "of", "characters"],
  "setting": "Where this takes place"
}

PANEL STRUCTURE GUIDELINES:
- Panel 1: MUST establish the news context visually (show the situation from the news)
- Middle panels: Develop the satirical twist or absurdity
- Final panel: Deliver the punchline that comments on the news story

VISUAL DESCRIPTION REQUIREMENTS:
1. Include FULL DETAILS about:
   - How the news story is being visually represented
   - Character positions, poses, and body language
   - Facial expressions and emotions (smiling, frowning, shocked, etc.)
   - Background elements and environment details
   - Props, objects, and visual elements that reference the news
   - Camera angle/perspective (close-up, wide shot, bird's eye view)
   - Action and movement happening
   - Color suggestions for important elements
   - Size relationships between elements
   - Weather, lighting, or atmospheric details if relevant

2. Write 4-6 detailed sentences per panel description
3. Be specific about character actions and reactions
4. Describe the visual humor elements clearly
5. Include small background details that enhance the joke
6. Make clear visual references to the actual news story

TEXT RULES:
1. EXACTLY ${panelCount} panel(s) - no more, no less
2. Maximum 3 words per text element (dialogue, sign, caption)
3. ONLY text in "visibleText" array will be rendered
4. Use SIMPLE, COMMON words only
5. ALL TEXT MUST BE IN ALL CAPS

EXAMPLE FOR ${panelCount} PANEL${panelCount === 1 ? '' : 'S'}:
${getExampleScriptJson(panelCount)}

Generate the JSON array now:`;
};

export const buildImagePrompt = (concept: CartoonConcept, script: ComicScript, panelCount: number = 4): string => {
    // Extract all text elements from the script
    const textElements = extractTextElements(script);

    // Validate text before building prompt
    console.log('[buildImagePrompt] Building image prompt with', textElements.length, 'text elements');
    textElements.forEach(elem => {
        console.log(`  - Panel ${elem.panel}: "${elem.text}" (${elem.type})`);
    });

    // Build text manifest with letter-by-letter spelling format
    const textManifest = textElements.length > 0 ? `
TEXT TO RENDER IN IMAGE:
${textElements.map(elem => {
        const spelled = spellOutTextWithBrackets(elem.text);
        return `Panel ${elem.panel} (${elem.type}): [${spelled}]`;
    }).join('\n')}
` : '';

    const panelDescription = panelCount === 1
        ? 'Single panel editorial cartoon'
        : `${panelCount}-panel comic strip (horizontal layout)`;

    // Simplified, clear prompt structure
    return `Generate a cartoon image: ${panelDescription}

CONCEPT:
Title: ${concept.title}
Premise: ${concept.premise}
Location: ${concept.location}

VISUAL DESCRIPTION:
${script.panels.map((panel, i) => {
        if (typeof panel === 'string') return `Panel ${i + 1}: ${panel}`;
        if ('visualDescription' in panel) return `Panel ${i + 1}: ${(panel as ComicScriptPanel).visualDescription}`;
        return `Panel ${i + 1}: ${(panel as ComicPanel).description || 'Visual scene'}`;
    }).join('\n')}

${textManifest}
TEXT RENDERING RULES:
1. ONLY text shown above should appear in the image
2. Each letter must be CLEAR and READABLE
3. Use BOLD, SANS-SERIF font (like Impact or Arial Black)
4. Text must be ALL CAPS
5. Make text LARGE and PROMINENT
6. Maximum 3 words per text element
7. If text doesn't fit clearly, use fewer words

VISUAL STYLE:
- Professional editorial cartoon quality
- Sharp, clean line art
- Expressive character faces and body language
- Bright, newspaper-appropriate colors
- Visual humor through situations, not just text
- Clear visual flow and composition

TEXT VERIFICATION: Render EXACTLY as shown in text list above. Every word must match perfectly.`;
};

export const buildHumorScorePrompt = (title: string, description?: string): string => {
    return `You are a comedy analyst evaluating news for editorial cartoon potential.

Title: ${title}
${description ? `Description: ${description}` : ''}

Score this on multiple humor dimensions (0-20 each):

1. ABSURDITY: How bizarre/unexpected is this situation?
2. IRONY: Is there contradiction between expectation and reality?
3. VISUAL POTENTIAL: Can this be shown without words?
4. RELATABILITY: Will everyday people find this familiar yet silly?
5. BENIGN VIOLATION: Is it wrong but ultimately harmless?

Add the scores for a total out of 100.

Consider these comedy goldmines:
- Human incompetence in positions of power
- Technology failing in ironic ways
- Animals/objects behaving like humans
- Bureaucracy taken to absurd extremes
- Modern problems that would confuse ancestors
- David vs Goliath situations
- "First world problems" taken seriously

Respond with ONLY the total number (1-100).`;
};

export const buildBatchAnalysisPrompt = (batch: Array<{ title: string; description?: string; content?: string }>): string => {
    return `You are an expert editorial cartoonist analyzing news articles for their cartoon potential.

Analyze these ${batch.length} news articles and for each one provide:
1. A 1-2 paragraph summary highlighting the key satirical angle and comedic elements that would make it funny as a cartoon
2. A humor score from 1-100 based on cartoon potential (absurdity, irony, visual comedy, satire opportunities)

Articles:
${batch.map((article, idx) => `
Article ${idx + 1}:
Title: ${article.title}
Description: ${article.description || 'No description'}
${article.content ? `Content excerpt: ${article.content.substring(0, 300)}...` : ''}
`).join('\n---\n')}

Respond ONLY with a valid JSON array with EXACTLY ${batch.length} entries (one for each article above), in this format:
[
  {"summary": "The satirical angle here is...", "humorScore": 75},
  {"summary": "This story offers comedic potential because...", "humorScore": 82}${batch.length > 2 ? ',\n  {"summary": "...", "humorScore": 65}' : ''}
]`;
};
