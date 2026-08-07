/**
 * Word Quest — Educational Dictionary Module (dictionary.js)
 * Provides instant, curated definitions for all literary, grammatical,
 * historical, and author terms in Word Quest.
 */

'use strict';

const WORD_DEFINITIONS = {
    // ── Literary Devices & Concepts ──
    'ALLEGORY': 'A story or poem that can be interpreted to reveal a hidden moral or political meaning.',
    'ALLITERATION': 'The repetition of identical consonant sounds at the beginning of neighboring words.',
    'ALLUSION': 'An indirect or passing reference to a person, place, event, or literary work.',
    'ANAPHORA': 'The repetition of a word or phrase at the beginning of successive clauses or sentences.',
    'ANTAGONIST': 'The principal opponent or adversary of the protagonist in a story.',
    'ASSONANCE': 'The repetition of similar vowel sounds within nearby words in poetry or prose.',
    'BALLAD': 'A poem or song narrating a story in short stanzas, traditionally passed down orally.',
    'BIOGRAPHY': 'An account of a person\'s life written by another individual.',
    'CATHARSIS': 'The release and purification of emotional tension through art or dramatic tragedy.',
    'CHARACTER': 'A person, animal, or entity taking part in a literary work or play.',
    'CLIMAX': 'The turning point and most intense, exciting moment in a narrative plot.',
    'COMEDY': 'A literary work intended to be humorous or amusing, typically ending happily.',
    'CONFLICT': 'The central struggle between opposing forces that drives the plot forward.',
    'CONNOTATION': 'An idea or feeling that a word invokes in addition to its literal meaning.',
    'COUPLET': 'A pair of successive lines of verse, typically rhyming and of the same length.',
    'DENOTATION': 'The literal, primary dictionary definition of a word, devoid of emotion.',
    'DIALOGUE': 'A spoken conversation between two or more characters in a literary text or play.',
    'DICTION': 'The author\'s choice and use of words and phrases in speech or writing.',
    'DRAMA': 'A mode of narrative fiction represented in performance by actors on a stage.',
    'ELEGY': 'A serious, mournful poem, typically written as a lament for someone who has died.',
    'EPILOGUE': 'A section at the end of a book or play serving as a comment or conclusion to the work.',
    'EUPHEMISM': 'A mild or indirect phrase substituted for one considered harsh or blunt.',
    'EXPOSITION': 'The insertion of background information regarding setting or characters within a story.',
    'FANTASY': 'A genre of speculative fiction involving magical elements, mythical creatures, or surreal worlds.',
    'FICTION': 'Literature created from the imagination, not presented as strict historical fact.',
    'FLASHBACK': 'A scene set in a time earlier than the main story that interrupts the chronological order.',
    'FORESHADOWING': 'A literary device in which a writer gives an advance hint of what is to come later.',
    'GENRE': 'A category or artistic composition characterized by similarities in form, style, or subject matter.',
    'HYPERBOLE': 'Exaggerated statements or claims not intended to be taken literally, used for emphasis.',
    'IMAGERY': 'Visually descriptive or figurative language that appeals to the physical senses.',
    'IRONY': 'A contrast between expectation and reality, or words expressing the opposite of literal truth.',
    'METAPHOR': 'A figure of speech directly comparing two unlike things without using "like" or "as".',
    'MONOLOGUE': 'A long speech presented by a single character to express their thoughts aloud.',
    'MOTIF': 'A recurring element, image, or idea that has symbolic significance in a story.',
    'NARRATOR': 'The voice or character telling the events of a story or recounting experiences.',
    'NOVEL': 'A lengthy fictional prose narrative describing character actions and sequential events.',
    'ODE': 'A formal, lyrical poem expressing praise or devotion to a particular subject or person.',
    'OXYMORON': 'A figure of speech in which apparently contradictory terms appear together (e.g. deafening silence).',
    'PARADOX': 'A seemingly absurd or self-contradictory statement that reveals a deeper truth upon investigation.',
    'PERSONIFICATION': 'Attributing human characteristics or emotions to non-human entities or abstract concepts.',
    'PLOT': 'The sequence of interconnected events that make up the structure of a story.',
    'POETRY': 'Literary work in which special intensity is given to expression through rhythm, imagery, and meter.',
    'PROLOGUE': 'An introductory speech or section of a literary work that establishes context.',
    'PROTAGONIST': 'The leading character or hero in a drama, novel, or narrative story.',
    'PUN': 'A humorous play on words exploiting multiple meanings or words that sound similar.',
    'SATIRE': 'The use of humor, irony, exaggeration, or ridicule to expose and criticize human folly or vice.',
    'SIMILE': 'A figure of speech comparing two different things using explicit connectors like "as" or "like".',
    'SOLILOQUY': 'An act of speaking one\'s thoughts aloud when alone on stage, especially in a drama.',
    'SONNET': 'A 14-line poem written in iambic pentameter with a structured rhyme scheme.',
    'STANZA': 'A group of lines forming the basic recurring metrical unit in a poem; a verse paragraph.',
    'SYMBOLISM': 'The use of symbols to represent ideas or qualities beyond their literal meaning.',
    'THEME': 'The main underlying message, moral, or central idea explored throughout a literary work.',
    'TONE': 'The author\'s attitude toward the subject matter or audience conveyed through word choice.',
    'TRAGEDY': 'A dramatic genre presenting serious themes and ending in catastrophe or sorrow for the hero.',
    'VERSE': 'Writing arranged with a metrical rhythm, typically having a rhyming structure.',

    // ── Authors & Literary Figures ──
    'SHAKESPEARE': 'William Shakespeare (1564–1616) — Iconic English playwright and poet; author of Hamlet & Macbeth.',
    'CHAUCER': 'Geoffrey Chaucer (c. 1340–1400) — Father of English literature; author of The Canterbury Tales.',
    'DICKENS': 'Charles Dickens (1812–1870) — Master Victorian novelist; author of A Tale of Two Cities & Great Expectations.',
    'AUSTEN': 'Jane Austen (1775–1817) — Renowned English author famed for Pride and Prejudice & romantic realism.',
    'ORWELL': 'George Orwell (1903–1950) — English novelist famous for dystopian masterpieces Animal Farm & 1984.',
    'TOLKIEN': 'J.R.R. Tolkien (1892–1973) — Scholar and master fantasy author of The Hobbit & The Lord of the Rings.',
    'SHELLEY': 'Mary Shelley (1797–1851) — Romantic novelist and creator of Frankenstein; pioneer of science fiction.',
    'BYRON': 'Lord Byron (1788–1824) — Leading Romantic poet famed for Don Juan and the Byronic heroic archetype.',
    'KEATS': 'John Keats (1795–1821) — Celebrated English Romantic poet known for sensual imagery in his famous Odes.',
    'WORDSWORTH': 'William Wordsworth (1770–1850) — Major Romantic poet who helped launch the Romantic Age in English literature.',
    'ELIOT': 'T.S. Eliot (1888–1965) — Nobel Prize-winning modernist poet; author of The Waste Land & Four Quartets.',
    'WOOLF': 'Virginia Woolf (1882–1941) — English modernist writer famous for stream-of-consciousness narrative style.',
    'HEMINGWAY': 'Ernest Hemingway (1899–1961) — Nobel laureate famous for crisp iceberg theory prose style.',
    'POE': 'Edgar Allan Poe (1809–1849) — Master of gothic horror, mystery, and developer of the modern detective story.',
    'FROST': 'Robert Frost (1874–1963) — Beloved American poet renowned for realistic depictions of rural New England life.',
    'MILTON': 'John Milton (1608–1674) — English epic poet who composed Paradise Lost in blank verse.',
    'WILDE': 'Oscar Wilde (1854–1900) — Witty Irish playwright and poet, author of The Picture of Dorian Gray.',
    'JOYCE': 'James Joyce (1882–1941) — Avant-garde Irish novelist, author of Ulysses and master of stream-of-consciousness.',
    'KIPLING': 'Rudyard Kipling (1865–1936) — English journalist & novelist, creator of The Jungle Book stories.',
    'PLATH': 'Sylvia Plath (1932–1963) — American confessional poet and author of the acclaimed novel The Bell Jar.',
    'BRONTE': 'The Brontë Sisters — Famous English literary family (Charlotte, Emily, Anne) who wrote Jane Eyre & Wuthering Heights.',
    'CERVANTES': 'Miguel de Cervantes (1547–1616) — Spanish novelist who wrote Don Quixote, widely considered the first modern novel.',
    'DANTE': 'Dante Alighieri (1265–1321) — Italian poet of the Middle Ages, famous for his epic Divine Comedy.',
    'FITZGERALD': 'F. Scott Fitzgerald (1896–1940) — Jazz Age American novelist, world famous for writing The Great Gatsby.',
    'HARDY': 'Thomas Hardy (1840–1928) — English novelist & poet known for tragic realism set in semi-fictional Wessex.',
    'KAFKA': 'Franz Kafka (1883–1924) — Bohemian author whose surreal works explored existential dread (e.g. The Metamorphosis).',
    'MELVILLE': 'Herman Melville (1819–1891) — American novelist & poet who penned the classic whaling epic Moby-Dick.',
    'STEINBECK': 'John Steinbeck (1902–1968) — Nobel laureate author of Of Mice and Men & The Grapes of Wrath.',
    'WHITMAN': 'Walt Whitman (1819–1892) — Father of American free verse poetry and author of Leaves of Grass.',
    'YEATS': 'W.B. Yeats (1865–1939) — Giant of 20th-century Irish literature, modernist poet & Nobel Prize winner.',

    // ── Classics & Literary Works ──
    'HAMLET': 'Tragedy by William Shakespeare depicting Prince Hamlet\'s revenge against his murderous uncle.',
    'MACBETH': 'Shakespearean tragedy depicting the corrupting physical and psychological effects of political ambition.',
    'OTHELLO': 'Tragic play by Shakespeare exploring jealousy, deception, and betrayal engineered by Iago.',
    'TEMPEST': 'Shakespeare\'s romance play following the exiled sorcerer Prospero on a magical island.',
    'ODYSSEY': 'Ancient Greek epic poem attributed to Homer detailing Odysseus\' 10-year journey home after Troy.',
    'ILIAD': 'Homeric epic poem recounting the rage of Achilles and key events during the final weeks of the Trojan War.',
    'BEOWULF': 'Old English heroic epic poem following the Scandinavian hero Beowulf as he slays the monster Grendel.',
    'ULYSSES': 'Modernist masterpiece novel by James Joyce paralleling Homer\'s Odyssey over a single day in Dublin.',
    'DRACULA': 'Gothic horror novel by Bram Stoker that established many conventions of vampire fantasy literature.',
    'FRANKENSTEIN': 'Gothic novel by Mary Shelley exploring scientific hubris and the creation of a sentient monster.',
    'EMMA': 'Novel by Jane Austen exploring youthful hubris and romantic misunderstandings among high society.',
    'PERSUASION': 'Jane Austen\'s mature romance novel centered on second chances in love between Anne Elliot & Captain Wentworth.',
    'DORIANGRAY': 'The Picture of Dorian Gray — Novel by Oscar Wilde about a man whose portrait ages while he stays young.',
    'ANIMALFARM': 'Animal Farm — Dystopian allegorical novella by George Orwell criticizing totalitarianism.',
    'NINETEENEIGHTYFOUR': '1984 — Dystopian novel by George Orwell warning against totalitarian surveillance & Big Brother.',
    'PARADISELOST': 'Paradise Lost — Epic poem in blank verse by John Milton detailing the Fall of Man and Satan\'s rebellion.',
    'CANTERBURY': 'The Canterbury Tales — Collection of 24 stories written in Middle English by Geoffrey Chaucer.',
    'KINGLEAR': 'Tragedy by Shakespeare depicting King Lear\'s descent into madness after dividing his kingdom among daughters.',
    'FAUST': 'Classic legend of a scholar who trades his soul to the devil (Mephistopheles) for unlimited knowledge and power.',
    'GATSBY': 'The Great Gatsby — Novel by F. Scott Fitzgerald exposing idealism and disillusionment in the 1920s Jazz Age.',
    'GOTHIC': 'A genre of literature combining elements of horror, death, mystery, romance, and haunted settings.',
    'HEROIC': 'Relating to brave figures, grand deeds, or epic poetry celebrating courageous achievements.',
    'MOBYDICK': 'Moby-Dick — Epic American novel by Herman Melville recounting Captain Ahab\'s obsession with a white whale.',
    'PRIDE': 'Pride and Prejudice — Iconic novel by Jane Austen featuring Elizabeth Bennet and Mr. Darcy.',
    'ROMEO': 'Romeo and Juliet — Shakespearean tragedy depicting two star-crossed lovers from feuding families.',

    // ── Grammar & Linguistics ──
    'ADJECTIVE': 'A word that modifies or describes a noun or pronoun by providing quality or detail.',
    'ADVERB': 'A word that modifies a verb, adjective, or another adverb, indicating how, when, or where.',
    'CLAUSE': 'A group of words containing a subject and a predicate, forming part or all of a sentence.',
    'CONJUNCTION': 'A word used to connect clauses, sentences, or words together (e.g. and, but, or).',
    'GERUND': 'A verb form ending in "-ing" that functions syntactically as a noun (e.g. Swimming is fun).',
    'HOMOPHONE': 'Words that sound identical in pronunciation but differ in meaning, origin, or spelling.',
    'IDIOM': 'An established phrase or expression whose figurative meaning differs from its literal words.',
    'INTERJECTION': 'An abrupt exclamation inserted into speech to express emotion (e.g. Wow! Alas!).',
    'NOUN': 'A part of speech naming a person, place, thing, quality, or abstract idea.',
    'PRONOUN': 'A word used in place of a noun to avoid repetition (e.g. he, she, it, they).',
    'PREFIX': 'An affix placed before the stem of a word to alter its meaning (e.g. un-, re-, pre-).',
    'SUFFIX': 'An affix added to the end of a word to alter its tense or grammatical function (e.g. -ing, -ed, -ness).',
    'PREPOSITION': 'A word governing a noun or pronoun, expressing a spatial or temporal relation (e.g. in, on, under).',
    'PREDICATE': 'The part of a sentence containing a verb and stating something about the subject.',
    'SUBJECT': 'The noun or clause in a sentence that performs the action or is described by the verb.',
    'TENSE': 'A grammatical category locating a situation in time (past, present, or future).',
    'VERB': 'A part of speech conveying an action, occurrence, state of being, or process.',
    'VOCABULARY': 'The body of words used in a particular language, field, or known by an individual.',
    'SYNTAX': 'The arrangement of words and phrases to create well-formed sentences in a language.',
    'SEMANTICS': 'The branch of linguistics concerned with the meaning of words and textual interpretation.',
    'PHONETICS': 'The study of speech sounds, their physical production, and acoustic transmission.',
    'MORPHOLOGY': 'The study of the internal structure of words and how morphemes form new words.',

    // ── Form & Technique ──
    'HAIKU': 'A traditional Japanese poetic form consisting of 17 syllables arranged in 3 lines (5-7-5).',
    'LIMERICK': 'A humorous 5-line poem with an AABBA rhyme scheme and bouncy rhythm.',
    'BLANKVERSE': 'Unrhymed poetry written in regular iambic pentameter rhythm.',
    'FREEVERSE': 'Poetry that does not use consistent meter patterns, rhyme, or musical tunes.',
    'RHYTHM': 'The measured pattern of rhythmic flow of stress or beat in music or spoken poetry.',
    'RHYME': 'Correspondence of sound between words or the endings of words in verse.',
    'METER': 'The structured accentual pattern and rhythm of poetic lines.',
    'REFRAIN': 'A repeated line or group of lines recurring at regular intervals in a poem or song.',
    'CHORUS': 'A repeated section of a poem, song, or play performed by a collective ensemble.',
    'LYRIC': 'A short, emotive poem expressing personal feelings or thoughts directly.',
    'EPIC': 'A long narrative poem celebrating the heroic deeds of legendary figures in grand style.',
    'STAGE': 'The designated raised platform or area where actors perform dramatic works.',
    'SCRIPT': 'The written text of a play, film, or broadcast including dialogue and stage directions.',
    'SCENE': 'A subdivision of an act in a play taking place in a single location and time.',
    'ACT': 'A major division in the structure of a play or dramatic work.',
    'CURTAIN': 'The hanging drape separating the stage from the audience auditorium.',
    'AUDIENCE': 'The assembled listeners or spectators observing a performance or reading a text.',
    'PLAYWRIGHT': 'A person who writes theatrical plays and dramatic literature.',
    'CAST': 'The group of actors chosen to portray characters in a play or performance.',
    'COSTUME': 'The clothes and attire worn by performers to embody a specific role or era.',
    'BILDUNGSROMAN': 'A novel detailing a protagonist\'s psychological & moral growth from youth to adulthood.',
    'ONOMATOPOEIA': 'The formation of a word from a sound associated with what is named (e.g. buzz, hiss).',
    'ANTHROPOMORPHISM': 'Attributing human characteristics, emotions, or behaviors to animals or non-human objects.',
    'STREAMOFCONSCIOUSNESS': 'A narrative technique capturing the continuous flow of character thoughts & sensory impressions.',
    'DECONSTRUCTION': 'A philosophical & critical method evaluating texts by uncovering internal contradictions.',
    'EXISTENTIALISM': 'A philosophy emphasizing individual existence, freedom, personal responsibility, and meaning.',
    'POSTMODERNISM': 'A movement characterized by skepticism toward absolute truths, irony, and self-referentiality.',
    'ROMANTICISM': 'An artistic & literary movement emphasizing emotion, individualism, nature, and imagination.',
    'TRANSCENDENTALISM': 'A philosophical movement advocating intuition, self-reliance, and spiritual connection with nature.',
    'METAFICTION': 'Fiction in which the author self-consciously alludes to the artificial nature of narrative creation.',
    'JUXTAPOSITION': 'Placing two contrasting images, ideas, or characters side-by-side to highlight differences.',
    'PATHETICFALLACY': 'Attributing human emotions to inanimate nature or weather (e.g. cruel wind, weeping clouds).',
    'SYNECDOCHE': 'A figure of speech where a part represents the whole or vice-versa (e.g. "all hands on deck").',

    // ── Additional Literary Terms ──
    'ACRONYM': 'An abbreviation formed from the initial letters of other words and pronounced as a word (e.g. NASA).',
    'ACROSTIC': 'A poem in which certain letters in each line form a hidden word or message.',
    'AFFIX': 'A morpheme attached to a word stem (prefix or suffix) to form a new word.',
    'ANTITHESIS': 'A person or thing that is the direct opposite of someone or something else.',
    'ANTONYM': 'A word opposite in meaning to another word (e.g. hot and cold).',
    'APOSTROPHE': 'A punctuation mark or a poetic address to an absent person or personified idea.',
    'BATHOS': 'An abrupt transition from the sublime to the ridiculous or trivial in literature.',
    'CINQUAIN': 'A five-line poem with specific syllable or word counts per line.',
    'DIPHTHONG': 'A sound formed by the combination of two vowels in a single syllable (e.g. coin, loud).',
    'DISSONANCE': 'A harsh, clashing combination of unharmonious sounds or words in verse.',
    'DRAMATIST': 'A person who writes plays or dramatic literature.',
    'ELLIPSIS': 'The omission of words from speech or text, indicated by three dots (...).',
    'EPIGRAM': 'A pithy, witty saying or poem expressing an idea in a clever, memorable way.',
    'EPITHET': 'An adjective or descriptive phrase expressing a quality characteristic of a person (e.g. Swift-footed Achilles).',
    'EUPHONY': 'The quality of being pleasing to the ear through harmonious, sweet sound combinations.',
    'HUBRIS': 'Excessive pride or dangerous self-confidence, often leading to a tragic hero\'s downfall.',
    'INFINITIVE': 'The basic un-conjugated form of a verb, usually preceded by "to" (e.g. to run).',
    'INVERSION': 'The reversal of the normal order of words for emphasis or poetic meter.',
    'LITOTES': 'Ironic understatement in which an affirmative is expressed by negating its opposite (e.g. "not bad").',
    'METONYMY': 'Substituting the name of an attribute or adjunct for that of the thing meant (e.g. "the crown" for royalty).',
    'MIDSUMMER': 'A Midsummer Night\'s Dream — Shakespeare\'s magical comedy of fairy mischief and love.',
    'MODIFIER': 'A word or phrase that qualifies, limits, or adds information to another word.',
    'MORPHEME': 'The smallest grammatical unit in a language that carries meaning (e.g. "in-come-ing").',
    'PARODY': 'An imitation of the style of a particular writer or genre with deliberate exaggeration for comic effect.',
    'PARTICIPLE': 'A verb form that functions as an adjective or forms compound verb tenses (e.g. running water).',
    'PASTORAL': 'Literary work depicting ideal rural life and shepherds in a peaceful, natural landscape.',
    'PHILOLOGY': 'The study of language in written historical sources; literary scholarship.',
    'RHETORIC': 'The art of effective or persuasive speaking and writing.',
    'SESTINA': 'A complex poem consisting of six 6-line stanzas followed by a 3-line envoy.',
    'SYNONYM': 'A word or phrase that means exactly or nearly the same as another word.',
    'TERCET': 'A set or group of three lines of verse rhyming together or connected by rhyme.',
    'TRANSITIVE': 'A verb that requires one or more direct objects to complete its action.',
    'VILLANELLE': 'A 19-line poetic form consisting of five tercets and a final quatrain with repeating refrains.',
    'VOICE': 'The distinctive style, tone, and personality of an author or narrator.'
};

/**
 * Clean & Format Word for Display
 * Example: 'ANIMALFARM' -> 'Animal Farm'
 */
function formatWordForDisplay(word) {
    if (!word) return '';
    const uppercaseMap = {
        'ANIMALFARM': 'Animal Farm',
        'NINETEENEIGHTYFOUR': '1984 (Nineteen Eighty-Four)',
        'PARADISELOST': 'Paradise Lost',
        'CANTERBURY': 'The Canterbury Tales',
        'KINGLEAR': 'King Lear',
        'DORIANGRAY': 'Dorian Gray',
        'BILDUNGSROMAN': 'Bildungsroman',
        'STREAMOFCONSCIOUSNESS': 'Stream of Consciousness',
        'BLANKVERSE': 'Blank Verse',
        'FREEVERSE': 'Free Verse',
        'PATHETICFALLACY': 'Pathetic Fallacy',
        'MIDSUMMER': 'Midsummer Night\'s Dream',
        'MOBYDICK': 'Moby-Dick'
    };

    if (uppercaseMap[word.toUpperCase()]) {
        return uppercaseMap[word.toUpperCase()];
    }

    // Capitalize normally: 'METAPHOR' -> 'Metaphor'
    const clean = word.trim().toUpperCase();
    return clean.charAt(0) + clean.slice(1).toLowerCase();
}

/**
 * Retrieve Definition for a word (Local lookup first, with online fallback)
 * @param {string} rawWord 
 * @returns {Promise<{wordDisplay: string, definition: string}>}
 */
async function getWordDefinition(rawWord) {
    if (!rawWord) return { wordDisplay: '', definition: 'No definition available.' };

    const cleanKey = rawWord.trim().toUpperCase();
    const display = formatWordForDisplay(cleanKey);

    // 1. Direct local dictionary match
    if (WORD_DEFINITIONS[cleanKey]) {
        return {
            wordDisplay: display,
            definition: WORD_DEFINITIONS[cleanKey]
        };
    }

    // 2. Try online Free Dictionary API as fallback for admin/custom words
    try {
        const queryTerm = rawWord.toLowerCase().replace(/[^a-z]/g, '');
        if (queryTerm.length >= 2) {
            const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(queryTerm)}`);
            if (resp.ok) {
                const data = await resp.json();
                const mean = data[0]?.meanings[0]?.definitions[0]?.definition;
                if (mean) {
                    return {
                        wordDisplay: display,
                        definition: mean
                    };
                }
            }
        }
    } catch (e) {
        // Fallback silently if offline or API fails
    }

    // 3. Fallback definition generator if dictionary and API missed
    return {
        wordDisplay: display,
        definition: `A featured term in Word Quest. Discover its usage and context in literary studies!`
    };
}

// Export to global scope
window.WORD_DEFINITIONS = WORD_DEFINITIONS;
window.formatWordForDisplay = formatWordForDisplay;
window.getWordDefinition = getWordDefinition;
