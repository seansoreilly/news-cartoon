export const decodeHtmlEntities = (text: string): string => {
  const div = document.createElement('div');
  div.innerHTML = text;
  return div.textContent || div.innerText || '';
};

export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

export const cleanDescription = (description: string): string => {
  // First strip HTML tags, then decode entities
  const stripped = stripHtmlTags(description);
  return decodeHtmlEntities(stripped).trim();
};

export const isTitleDuplicate = (title: string, description: string): boolean => {
  // Normalize both strings: lowercase, remove extra spaces
  const normalizeStr = (str: string) => str.toLowerCase().replace(/\s+/g, ' ').trim();

  const normalizedTitle = normalizeStr(title);
  const normalizedDesc = normalizeStr(description);

  // Check if description contains most of the title (accounting for variations)
  const titleWords = normalizedTitle.split(' ').filter(w => w.length > 3);

  // If more than 70% of title words appear in description, it's likely a duplicate
  const matchedWords = titleWords.filter(w => normalizedDesc.includes(w)).length;
  return matchedWords / titleWords.length > 0.7;
};

// Local humor scoring function (no API calls)
export const calculateHumorScore = (title: string, description?: string): number => {
    const text = `${title} ${description || ''}`.toLowerCase();
    let score = 30;
  
    const keywords = {
      absurd: ['bizarre', 'unusual', 'strange', 'weird', 'odd', 'unexpected', 'shocking', 'ridiculous'],
      ironic: ['ironic', 'despite', 'however', 'contradicts', 'opposite', 'backfire', 'paradox'],
      political: ['politician', 'government', 'minister', 'mayor', 'scandal', 'controversy', 'protest'],
      visual: ['falls', 'crash', 'stuck', 'trapped', 'costume', 'animal', 'giant', 'huge'],
      extreme: ['extreme', 'massive', 'record', 'unprecedented', 'worst', 'best', 'biggest']
    };
  
    Object.values(keywords).forEach(kws => {
      const matches = kws.filter(kw => text.includes(kw));
      score += Math.min(matches.length * 5, 15);
    });
  
    score += Math.min((text.match(/!/g) || []).length * 3, 9);
    score += Math.min((text.match(/\?/g) || []).length * 4, 12);
    if (text.length < 50) score -= 10;
    if (text.length > 200) score += 5;
  
    return Math.min(100, Math.max(1, Math.round(score)));
  };
