/*
  search.js
  ---------
  Implementa a busca de posts e perfis.

  Conceitos importantes usados aqui:

  1. Normalização: antes de comparar textos, removemos acentos e
     colocamos tudo em minúsculas. Assim "João" == "joao" na busca.

  2. Debounce: aguarda 300ms após o usuário parar de digitar antes
     de executar a busca. Evita processar cada tecla individualmente.

  3. Scoring: posts onde o termo aparece no início recebem pontuação
     maior. Isso ordena os resultados do mais ao menos relevante.

  4. Highlight: o termo encontrado é envolvido com <mark> no HTML
     para aparecer destacado visualmente nos resultados.

  Depende de: storage.js, profile.js, ui.js
*/

const Search = (() => {

  // Timer do debounce (guardado para poder cancelar se o usuário continuar digitando)
  let debounceTimer = null;

  // Delay em milissegundos — padrão da indústria para buscas em tempo real
  const DEBOUNCE_DELAY = 300;


  // ── Normalização ─────────────────────────────────────────────

  // Remove acentos e converte para minúsculas.
  // "São Paulo" → "sao paulo" | "REACT.js" → "react.js"
  function normalize(text) {
    if (!text) return '';
    return text
      .toLowerCase()
      .normalize('NFD')                   // separa "ã" em "a" + "~"
      .replace(/[\u0300-\u036f]/g, '')    // remove os acentos separados
      .trim();
  }

  // Escapa caracteres especiais de HTML para prevenir XSS.
  function escapeHTML(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text || ''));
    return div.innerHTML;
  }

  // Escapa caracteres especiais de RegExp para usar texto do usuário em regex.
  // Ex: "c++" sem escape quebraria o new RegExp()
  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }


  // ── Scoring (relevância) ─────────────────────────────────────

  // Calcula uma pontuação para um texto em relação à query.
  // Quanto maior o score, mais relevante é o resultado.
  //
  // Pontuação:
  //   0 → não encontrou nada
  //   2 → encontrou em algum lugar do texto
  //   5 → texto começa com a query
  //   3 → query aparece no início de alguma palavra
  function calculateScore(text, query) {
    if (!text || !query) return 0;
    if (!text.includes(query)) return 0;  // otimização: sai rápido se não há match

    let score = 2;  // base: encontrou em algum lugar

    if (text.startsWith(query)) {
      score += 5;  // começa com a query: mais relevante
    }

    // Verifica se a query aparece no início de alguma palavra
    // \b é "word boundary" (fronteira de palavra)
    const wordStartRegex = new RegExp(`\\b${escapeRegex(query)}`);
    if (wordStartRegex.test(text)) {
      score += 3;
    }

    return score;
  }


  // ── Busca de posts ───────────────────────────────────────────

  // Retorna posts cujo texto contenha a query, ordenados por relevância.
  // Cada item do array retornado tem: { post, score, query }
  function searchPosts(rawQuery) {
    const query = normalize(rawQuery);

    // Sem query: retorna todos os posts sem pontuação
    if (!query) {
      return Storage.getPosts().map(post => ({ post, score: 0, query: '' }));
    }

    return Storage.getPosts()
      .map(post => {
        const normalizedText = normalize(post.text);
        const score = calculateScore(normalizedText, query);
        return { post, score, query };
      })
      .filter(item => item.score > 0)         // apenas posts com match
      .sort((a, b) => b.score - a.score);     // mais relevante primeiro
  }


  // ── Busca de perfil ──────────────────────────────────────────

  // Busca no nome e bio do usuário.
  // O nome tem peso dobrado por ser a informação principal.
  // Retorna array com 0 ou 1 resultado (só há um usuário atualmente).
  function searchProfiles(rawQuery) {
    const query = normalize(rawQuery);

    if (!query) return [];

    const profile = Storage.getProfile();
    const nameScore = calculateScore(normalize(profile.name), query) * 2;
    const bioScore  = calculateScore(normalize(profile.bio || ''), query);
    const totalScore = nameScore + bioScore;

    if (totalScore === 0) return [];

    // Registra em quais campos o match aconteceu (usado para exibir o badge)
    const matchedFields = [];
    if (nameScore > 0) matchedFields.push('name');
    if (bioScore  > 0) matchedFields.push('bio');

    return [{ profile, score: totalScore, query, matchedFields }];
  }


  // ── Highlight ────────────────────────────────────────────────

  // Envolve as ocorrências da query no texto com <mark class="search-highlight">.
  // O texto é escapado antes para prevenir XSS.
  function highlight(text, query) {
    if (!text || !query) return escapeHTML(text || '');

    const escaped = escapeHTML(text);

    try {
      const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
      return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    } catch {
      return escaped;  // fallback se a regex falhar
    }
  }

  // Extrai um trecho do texto ao redor da primeira ocorrência da query.
  // Evita mostrar textos muito longos nos cards de resultado.
  function extractSnippet(text, query, maxLength = 120) {
    if (!text) return '';
    if (text.length <= maxLength) return text;

    const normalizedText  = normalize(text);
    const normalizedQuery = normalize(query);
    const matchIndex = normalizedText.indexOf(normalizedQuery);

    if (matchIndex === -1) {
      return text.substring(0, maxLength) + '…';
    }

    // Centraliza o trecho ao redor do match
    const padding = Math.floor((maxLength - query.length) / 2);
    const start   = Math.max(0, matchIndex - padding);
    const end     = Math.min(text.length, matchIndex + query.length + padding);

    const snippet = text.substring(start, end);
    const prefix  = start > 0             ? '…' : '';
    const suffix  = end   < text.length   ? '…' : '';

    return prefix + snippet + suffix;
  }


  // ── Renderização dos resultados ──────────────────────────────

  // Executa a busca e atualiza a área de resultados na aba de busca.
  function executeSearch(rawQuery) {
    const query       = rawQuery.trim();
    const resultsEl   = document.getElementById('searchResults');
    const placeholder = document.getElementById('searchPlaceholder');
    const countEl     = document.getElementById('searchResultCount');

    if (!resultsEl) return;

    // Campo vazio: mostra o placeholder com as sugestões
    if (!query) {
      placeholder?.classList.remove('hidden');
      resultsEl.innerHTML = '';
      countEl?.classList.add('hidden');
      return;
    }

    placeholder?.classList.add('hidden');
    resultsEl.innerHTML = '';

    const postResults    = searchPosts(query);
    const profileResults = searchProfiles(query);
    const totalResults   = postResults.length + profileResults.length;

    // Atualiza o contador de resultados
    if (countEl) {
      countEl.textContent = totalResults === 0
        ? 'Sem resultados'
        : `${totalResults} resultado${totalResults !== 1 ? 's' : ''}`;
      countEl.classList.remove('hidden');
    }

    // Nenhum resultado encontrado
    if (totalResults === 0) {
      resultsEl.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">🔍</div>
          <p>Nenhum resultado para <strong>"${escapeHTML(query)}"</strong></p>
          <span>Tente palavras diferentes ou verifique a ortografia.</span>
        </div>
      `;
      return;
    }

    // Renderiza seção de perfis (aparecem primeiro)
    if (profileResults.length > 0) {
      const section = document.createElement('div');
      section.className   = 'search-section';
      section.innerHTML   = `<h3 class="search-section-title">Usuários</h3>`;

      profileResults.forEach(result => {
        section.appendChild(createProfileCard(result));
      });

      resultsEl.appendChild(section);
    }

    // Renderiza seção de posts
    if (postResults.length > 0) {
      const section = document.createElement('div');
      section.className   = 'search-section';
      section.innerHTML   = `<h3 class="search-section-title">Postagens (${postResults.length})</h3>`;

      postResults.forEach(result => {
        section.appendChild(createPostCard(result));
      });

      resultsEl.appendChild(section);
    }
  }

  // Cria o card de resultado para um perfil.
  function createProfileCard({ profile, query, matchedFields }) {
    const card = document.createElement('div');
    card.className = 'search-result-card search-result-profile';

    const initials   = Profile.getInitials(profile.name);
    const avatarHTML = profile.avatarUrl
      ? `<img src="${profile.avatarUrl}" alt="Foto de ${escapeHTML(profile.name)}"/>`
      : escapeHTML(initials);

    // Badge indica onde o match aconteceu
    const matchBadge = matchedFields.includes('name')
      ? '<span class="match-badge match-name">nome</span>'
      : '<span class="match-badge match-bio">bio</span>';

    card.innerHTML = `
      <div class="result-ava">${avatarHTML}</div>
      <div class="result-body">
        <div class="result-name">
          ${highlight(profile.name, query)}
          ${matchBadge}
        </div>
        ${profile.bio
          ? `<div class="result-bio">${highlight(profile.bio, query)}</div>`
          : ''}
      </div>
      <div class="result-arrow">→</div>
    `;

    card.addEventListener('click', () => {
      UI.activateTab('profile');
      clearSearch();
    });

    return card;
  }

  // Cria o card de resultado para um post.
  function createPostCard({ post, query }) {
    const card = document.createElement('div');
    card.className = 'search-result-card search-result-post';

    const snippet = extractSnippet(post.text, query);
    const dateStr = new Date(post.createdAt).toLocaleDateString('pt-BR', {
      day: 'numeric', month: 'short',
    });

    card.innerHTML = `
      <div class="result-post-body">
        <div class="result-post-text">${highlight(snippet, query)}</div>
        <div class="result-post-meta">
          <span>${escapeHTML(Profile.get().name)}</span>
          <span class="result-dot">·</span>
          <time>${dateStr}</time>
          ${post.image ? '<span class="result-has-img">📷</span>' : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      UI.activateTab('feed');
      clearSearch();
      // Aguarda o feed renderizar antes de destacar o post
      setTimeout(() => highlightPostInFeed(post.id), 100);
    });

    return card;
  }

  // Rola até o post no feed e aplica animação de destaque.
  function highlightPostInFeed(postId) {
    const postElement = document.querySelector(`[data-id="${postId}"]`);
    if (!postElement) return;

    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    postElement.classList.add('post-search-highlight');

    setTimeout(() => postElement.classList.remove('post-search-highlight'), 2000);
  }


  // ── Debounce e handler principal ─────────────────────────────

  // Recebe o texto digitado, aplica debounce e executa a busca.
  // Também sincroniza todos os campos de busca com o mesmo valor.
  function handleSearchInput(query) {
    // Sincroniza os dois campos de busca (feed e aba de busca)
    document.querySelectorAll('.search-input').forEach(input => {
      if (input.value !== query) input.value = query;
    });

    // Aguarda o usuário parar de digitar antes de buscar
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => executeSearch(query), DEBOUNCE_DELAY);
  }


  // ── Limpar busca ─────────────────────────────────────────────

  // Reseta tudo: campos, resultados, contadores.
  function clearSearch() {
    document.querySelectorAll('.search-input').forEach(input => {
      input.value = '';
    });

    const resultsEl  = document.getElementById('searchResults');
    const placeholder = document.getElementById('searchPlaceholder');
    const countEl    = document.getElementById('searchResultCount');

    if (resultsEl)   resultsEl.innerHTML = '';
    if (placeholder) placeholder.classList.remove('hidden');
    if (countEl)     countEl.classList.add('hidden');
  }


  // ── API pública ──────────────────────────────────────────────

  return {
    searchPosts,
    searchProfiles,
    normalize,
    highlight,
    handleSearchInput,
    clearSearch,
  };

})();
