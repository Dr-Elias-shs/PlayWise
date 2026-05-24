/**
 * Spelling Bee — word bank + Supabase helpers.
 *
 * Supabase table (run once in dashboard):
 *
 *   CREATE TABLE spelling_bee_words (
 *     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *     word text NOT NULL,
 *     grade integer NOT NULL CHECK (grade >= 1 AND grade <= 12),
 *     hint text,
 *     is_custom boolean DEFAULT false,
 *     created_at timestamptz DEFAULT now()
 *   );
 *   CREATE INDEX idx_sbw_grade ON spelling_bee_words(grade);
 */

import { supabase } from './supabase';

// 100 grade-appropriate default words per grade (1–12)
export const SPELLING_BEE_DEFAULTS: Record<number, string[]> = {
  1: [
    'cat','dog','sun','hat','map','pen','bus','cup','leg','arm',
    'book','bird','fish','frog','star','tree','ball','cake','door','hand',
    'kite','lamp','milk','nose','rain','ring','duck','rose','drum','leaf',
    'ship','ant','bat','bee','bow','cow','ear','egg','fan','fly',
    'fox','hen','ice','jar','jet','joy','key','log','mud','nut',
    'oak','owl','paw','pie','pig','pot','rat','saw','sea','sky',
    'tab','tap','tin','toe','top','tub','van','vow','wax','web',
    'yak','zoo','ape','axe','bay','bed','bug','bun','cap','car',
    'cut','dew','dim','dip','dug','elm','eye','fed','fit','fog',
    'fun','gap','gum','hop','hot','hug','hut','ink','kin','kit',
  ],
  2: [
    'apple','beach','cloud','dance','earth','flame','grape','house','juice','lemon',
    'magic','night','ocean','piano','river','space','tiger','water','brain','chair',
    'dream','eagle','frost','honey','pizza','robot','shark','sword','torch','clock',
    'plant','stone','candy','chalk','chest','child','chill','clean','clear','cliff',
    'climb','clown','coat','corn','crab','crow','cube','dark','dash','date',
    'dawn','deep','dish','dome','dove','draw','drop','earn','face','fall',
    'farm','fast','fire','flag','flat','flow','food','form','four','free',
    'full','gift','girl','glad','glow','glue','goal','gold','grew','grin',
    'grow','hard','help','hero','hide','high','hill','home','hope','hunt',
    'jump','kind','knot','lake','loud','love','mint','park','plan','pray',
  ],
  3: [
    'jungle','mirror','rocket','silver','trophy','valley','walnut','ancient','balance','courage',
    'eclipse','fortune','journey','kingdom','lantern','mystery','volcano','basket','bridge','button',
    'candle','carpet','castle','center','change','charge','choose','circle','clever','corner',
    'cotton','cousin','credit','desert','divide','effort','engine','escape','finger','flower',
    'forest','frozen','gentle','global','handle','happen','harbor','helmet','hidden','hungry',
    'import','island','jacket','knight','ladder','lawyer','leader','legend','locker','lonely',
    'luggage','market','matter','meadow','monkey','mother','narrow','nature','noodle','orange',
    'oyster','palace','panda','parrot','pattern','pencil','pepper','person','pillow','pocket',
    'rabbit','rescue','saddle','sample','season','settle','simple','sister','sketch','snatch',
    'square','stable','system','ticket','tangle','turtle','update','useful','wonder','yellow',
  ],
  4: [
    'abandon','achieve','advance','bandage','bargain','blanket','blossom','buffalo','cabinet','capable',
    'capture','century','chapter','charity','climate','command','compete','compose','compute','conduct',
    'confirm','council','country','culture','curious','current','declare','decline','defeat','defense',
    'deposit','describe','design','detail','develop','diamond','digital','diploma','discuss','display',
    'distant','disturb','economy','elegant','element','explore','express','extreme','factory','feature',
    'festival','fiction','flexible','foreign','forward','freedom','general','glimpse','gravity','grateful',
    'habitat','harvest','healthy','helpful','history','holiday','horizon','imagine','improve','inspire',
    'justice','language','library','limited','measure','medical','message','miracle','mixture','molecule',
    'muscle','natural','nourish','nuclear','observe','operate','opinion','organize','outcome','overcome',
    'package','patience','perform','picture','prevent','produce','protect','provide','publish','purpose',
  ],
  5: [
    'absolute','abundant','accident','accurate','acoustic','adequate','adjusted','advanced','aircraft','alphabet',
    'ambition','ancestor','animated','announce','apparent','appetite','assigned','athletic','attached','attitude',
    'audience','balanced','behavior','believed','boundary','calendar','campaign','champion','chemical','circular',
    'civilian','classify','colorful','combined','committee','community','conclude','conflict','congress','consider',
    'continue','contrast','convince','criminal','critical','cultural','customer','decision','declared','defeated',
    'definite','describe','designed','detailed','directly','disaster','discover','distance','distinct','document',
    'dominant','dramatic','electric','employed','engineer','enormous','entrance','equation','evaluate','evidence',
    'exercise','expected','explored','extended','familiar','fearless','festival','flexible','fragment','function',
    'generous','governed','graceful','grateful','guardian','harmless','heritage','hospital','identify','isolated',
    'keyboard','kinetic','literary','magnetic','majority','material','medieval','midnight','military','moderate',
  ],
  6: [
    'abbreviate','accumulate','acknowledge','administer','advantage','aesthetic','affirmative','aggressive','agriculture','allegiance',
    'allocation','anniversary','antagonist','anticipate','appropriate','approximate','articulate','assumption','atmosphere','authenticate',
    'availability','benevolence','brilliance','bureaucracy','catastrophe','categorize','chronicle','citizenship','collaborate','collective',
    'commemorate','comparative','complicated','comprehension','concentration','constitution','contaminate','continuously','contribution','controversy',
    'conventional','convergence','cooperation','dedication','deficiency','demonstrate','determination','differentiate','documentary','effectively',
    'efficiently','emphasize','environment','equilibrium','evaluation','evolutionary','examination','expression','extraordinary','facilitate',
    'federation','flourishing','foundation','fundamental','governmental','humanitarian','hypothesis','independent','influential','innovation',
    'interpretation','investigation','justification','legislative','legitimate','maintenance','management','manufacturing','measurement','methodology',
    'microscopic','modification','navigation','negotiation','neutrality','observatory','opportunity','optimistic','organization','orientation',
    'parliamentary','percentage','persistence','perspective','population','precipitation','probability','publication','qualification','significance',
  ],
  7: [
    'appreciate','arithmetic','beautiful','beginning','believe','brilliant','calendar','category','changeable','committee',
    'conscientious','controversial','curiosity','definitely','dependency','description','disappear','discipline','embarrass','emphasize',
    'encyclopedia','environment','especially','exaggerate','experience','explanation','extraordinary','fascinate','government','grammar',
    'guarantee','handkerchief','harassment','hierarchy','humorous','hygiene','immediately','independence','intelligence','interrupt',
    'jealousy','knowledge','lightning','magnificent','maintenance','mathematics','millennium','miniature','mischievous','necessary',
    'neighborhood','noticeable','occurrence','opportunity','parliament','perceive','permanent','phenomenon','privilege','psychology',
    'questionnaire','receive','recommend','reference','relevant','religious','restaurant','rhythm','ridiculous','sacrifice',
    'secretary','sentence','separate','significance','sincerely','sufficient','summarize','suppress','surprise','syllable',
    'temperature','throughout','tomorrow','tournament','tragedy','unnecessary','usually','vocabulary','wednesday','withhold',
    'accommodate','acquaintance','autonomous','benevolent','circumstance','collaborate','commemorate','communicate','congratulate','consecutive',
  ],
  8: [
    'abbreviation','abominable','accelerate','accessible','accommodate','accomplish','accumulate','acquaintance','adequately','administration',
    'allegiance','ambiguous','anonymous','apparatus','approximately','arbitrary','assassination','atmosphere','attendance','autonomous',
    'believable','beneficiary','bureaucratic','catastrophic','coincidence','collaborative','commiserate','compatible','comprehensive','conceivable',
    'confidential','connoisseur','conscience','conspicuous','contemporary','convenience','convergence','counterfeit','cumulative','deferential',
    'delinquency','demonstration','dependable','derivative','devastation','dilemma','disastrous','discrepancy','disillusioned','dysfunctional',
    'eccentricity','economically','elaboration','eloquently','embarrassment','empathetic','endurance','enthusiastic','equivalent','erroneous',
    'evaluation','exaggerated','exhaustive','exquisitely','fascination','feasibility','formidable','fraudulent','fundamental','generosity',
    'genuinely','grievance','hallucination','hesitation','humiliation','hypocritical','hypothesis','idiosyncratic','illegitimate','imagination',
    'incapacitate','incompatible','indiscriminate','inexplicable','infrastructure','inhabitable','initiative','innovation','insignificance','intellectual',
    'interpretation','investigation','justification','knowledgeable','manipulation','meticulous','multiplication','neutralization','observation','painstaking',
  ],
  9: [
    'abstinence','accentuate','acrimonious','amalgamate','ambivalence','ameliorate','anachronism','antagonistic','apprehension','assiduous',
    'atrocious','audacious','auspicious','benevolent','captivating','circumspect','clandestine','cognizant','colloquial','complacent',
    'conciliatory','condescending','conspicuous','contemptuous','contentious','convoluted','credulous','debilitate','decadence','deceptive',
    'deferential','deficiency','deleterious','despondent','deteriorate','dilapidated','diminutive','discriminate','disenchanted','disparate',
    'dissemble','divergent','eloquence','emaciate','eminence','empirical','enigmatic','ephemeral','equivocate','erratic',
    'exacerbate','exorbitant','exquisite','facilitate','fallacious','fastidious','fervent','fickle','formidable','frivolous',
    'frugal','garrulous','grandiose','gregarious','hypocrite','impetuous','inadvertent','indigenous','indomitable','inevitable',
    'inquisitive','insidious','integrity','introspective','irrevocable','laborious','laudable','lethargic','malevolent','meticulous',
    'nonchalant','obsolete','ostracize','painstaking','paradox','perfidious','procrastinate','profound','quandary','recalcitrant',
    'resilience','sycophant','ubiquitous','vacillate','voracious','wistful','zealous','venerate','tenacious','sagacious',
  ],
  10: [
    'abeyance','abnegation','abstemious','acerbity','acquiesce','acrimony','admonish','alacrity','alleviate','ambivalent',
    'ameliorate','analogous','anathema','animosity','antagonize','apathy','appease','approbation','arbitrary','arcane',
    'arduous','assiduous','assuage','atrophy','audacious','augment','austere','avarice','aversion','belligerent',
    'benign','blatant','brevity','cajole','callous','capricious','catharsis','caustic','censure','circumvent',
    'clandestine','coerce','cogent','cognizant','complacent','conciliatory','condescend','confound','convoluted','cryptic',
    'culpable','dauntless','debilitate','decorum','deference','delineate','demagogue','deprecate','destitute','devious',
    'diaphanous','didactic','diffident','digress','diligence','discern','disdain','disparate','dissipate','divergent',
    'dogmatic','duplicity','ebullient','eclectic','effusive','egregious','eloquent','emulate','ephemeral','equanimity',
    'equivocal','erudite','exacerbate','exorbitant','facetious','fallacious','fervent','flagrant','forthright','garrulous',
    'germane','gratuitous','gregarious','guile','harangue','hegemony','heresy','hierarchy','hubris','iconoclast',
  ],
  11: [
    'abjure','abstruse','acerbic','adjudicate','adroit','aggrandize','aloof','ameliorate','antithetical','aphorism',
    'approbation','arrogance','ascetic','attenuate','baleful','byzantine','cacophony','callous','candid','carping',
    'caustic','chicanery','circumlocution','cogent','commensurate','compunction','contrite','contrition','copious','covert',
    'culpable','decorum','deferential','demagogue','deprecate','despondent','diaphanous','didactic','dilettante','disconcert',
    'disenfranchise','disparate','dissemble','dogmatic','ebullient','eclectic','effrontery','effusive','egregious','elicit',
    'elliptical','eloquent','emollient','empirical','enumerate','ephemeral','equanimity','equivocal','erudite','eulogy',
    'excoriate','expeditious','expunge','fastidious','fervent','finagle','flagrant','furtive','garrulous','germane',
    'grandiloquent','gratuitous','harangue','hegemony','hubris','iconoclast','idiosyncrasy','ignominious','imbroglio','impetuous',
    'incorrigible','inculcate','indefatigable','inexorable','infallible','inscrutable','intransigent','irascible','loquacious','malfeasance',
    'mendacious','mercurial','nefarious','obfuscate','obsequious','pernicious','perspicacious','pontificate','prevaricate','recalcitrant',
  ],
  12: [
    'abnegation','abscond','abstemious','acrimony','acquiescence','adjudication','aggrandizement','allegory','amalgamation','amelioration',
    'anachronism','anathema','apostrophe','approbation','archetypal','assiduous','atavistic','austerity','autochthonous','avarice',
    'baroque','bifurcation','calumniate','caricature','catharsis','circumlocution','cogency','commiserate','compunction','contiguous',
    'contrition','copious','demagogue','desecrate','detrimental','diaphanous','diatribe','dichotomy','didactic','dilettante',
    'disenfranchise','disparate','dissipate','ebullience','eclectic','efficacious','effrontery','egregious','elicit','emollient',
    'empiricism','epicurean','equanimity','erudite','etymology','eulogize','exacerbate','expeditious','expunge','fastidious',
    'finagle','flagrant','furtive','grandiloquent','harangue','hegemony','hubris','iconoclast','idiosyncrasy','ignominious',
    'imbroglio','incorrigible','inculcate','indefatigable','inexorable','inscrutable','intransigent','irascible','loquacious','malfeasance',
    'mendacious','mercurial','nefarious','obfuscate','obsequious','pernicious','perspicacious','pontificate','prevaricate','recalcitrant',
    'sycophant','ubiquitous','vacuous','verisimilitude','vituperate','xenophobia','zealotry','zeitgeist','specious','solipsism',
  ],
};

export interface SpellingBeeWord {
  id: string;
  word: string;
  grade: number;
  hint?: string | null;
  is_custom: boolean;
  created_at: string;
}

// Returns the active word list for a grade — custom DB words if they exist, else defaults
export async function getWordsForGrade(grade: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('spelling_bee_words')
      .select('word')
      .eq('grade', grade)
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return [...(SPELLING_BEE_DEFAULTS[grade] ?? [])];
    }
    return data.map((r: { word: string }) => r.word.toUpperCase());
  } catch {
    return [...(SPELLING_BEE_DEFAULTS[grade] ?? [])];
  }
}

// Admin: full records for a grade
export async function getWordRecordsForGrade(grade: number): Promise<SpellingBeeWord[]> {
  const { data, error } = await supabase
    .from('spelling_bee_words')
    .select('*')
    .eq('grade', grade)
    .order('word', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// Admin: add a single word
export async function addSpellingWord(word: string, grade: number, hint?: string): Promise<void> {
  const clean = word.trim().toUpperCase();
  if (!clean) return;
  const { error } = await supabase
    .from('spelling_bee_words')
    .insert([{ word: clean, grade, hint: hint || null, is_custom: true }]);
  if (error) throw error;
}

// Admin: bulk-add words (returns count added)
export async function bulkAddSpellingWords(words: string[], grade: number): Promise<number> {
  const rows = words
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0)
    .map(word => ({ word, grade, is_custom: true }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('spelling_bee_words').insert(rows);
  if (error) throw error;
  return rows.length;
}

// Admin: delete a word by id
export async function deleteSpellingWord(id: string): Promise<void> {
  const { error } = await supabase.from('spelling_bee_words').delete().eq('id', id);
  if (error) throw error;
}

// Admin: wipe grade and re-seed from defaults
export async function resetGradeToDefaults(grade: number): Promise<void> {
  await supabase.from('spelling_bee_words').delete().eq('grade', grade);
  const defaults = SPELLING_BEE_DEFAULTS[grade] ?? [];
  if (defaults.length === 0) return;
  const rows = defaults.map(word => ({ word: word.toUpperCase(), grade, is_custom: false }));
  await supabase.from('spelling_bee_words').insert(rows);
}
