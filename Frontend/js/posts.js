/*
  posts.js
  --------
  Gerencia tudo relacionado às postagens:
  - Renderizar o feed e a lista de posts no perfil
  - Criar um novo post (texto + imagem opcional)
  - Abrir o modal de edição e salvar a edição
  - Excluir um post com confirmação
  - Gerenciar a imagem pendente no compose box
  - Atualizar o contador de caracteres

  Depende de: storage.js, profile.js (devem ser carregados antes)
*/

const Posts = (() => {

  // ID do post que está sendo editado no modal (null quando fechado)
  let editingPostId = null;

  // Imagem selecionada no compose, ainda não publicada (null se vazia)
  let pendingImageUrl = null;


  // ── Helpers ──────────────────────────────────────────────────

  // Formata uma data ISO para texto amigável em português.
  // "Hoje às 14:32" | "Ontem às 09:00" | "15 de jan. às 09:00"
  function formatDate(isoString) {
    const date      = new Date(isoString);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (date.toDateString() === today.toDateString()) {
      return `Hoje às ${time}`;
    }

    if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem às ${time}`;
    }

    const dayMonth = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    return `${dayMonth} às ${time}`;
  }

  // Escapa caracteres HTML para prevenir XSS.
  // Sempre usar ao inserir texto do usuário via innerHTML.
  function escapeHTML(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }


  // ── Criação de cards ─────────────────────────────────────────

  // Cria e retorna o elemento HTML de um único post.
  // Cada card tem: cabeçalho (avatar, nome, data, ações) + texto + imagem + rodapé.
  function createPostCard(post) {
    const profile  = Profile.get();
    const initials = Profile.getInitials(profile.name);

    const card = document.createElement('article');
    card.className  = 'post-card';
    card.dataset.id = post.id;  // usado para encontrar o card no DOM depois

    // Monta o HTML do avatar (foto ou iniciais)
    const avatarHTML = profile.avatarUrl
      ? `<img src="${profile.avatarUrl}" alt="Foto de ${escapeHTML(profile.name)}"/>`
      : escapeHTML(initials);

    // Monta a imagem do post, se houver
    const imageHTML = post.image
      ? `<div class="post-image">
           <img src="${post.image}" alt="Imagem da postagem" data-action="lightbox" title="Clique para ampliar" loading="lazy"/>
         </div>`
      : '';

    // Monta a tag "editado", se o post foi modificado
    const editedHTML = post.editedAt
      ? `<p class="post-edited-tag">editado ${formatDate(post.editedAt)}</p>`
      : '';

    // Formata a data completa para o rodapé
    const fullDate = new Date(post.createdAt).toLocaleString('pt-BR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    card.innerHTML = `
      <div class="post-head">
        <div class="post-ava" data-action="profile">${avatarHTML}</div>
        <div class="post-meta">
          <div class="post-author">${escapeHTML(profile.name)}</div>
          <div class="post-date">${formatDate(post.createdAt)}</div>
        </div>
        <div class="post-actions">
          <button class="pa-btn"     data-action="edit"   title="Editar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="pa-btn del" data-action="delete" title="Excluir">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
      <p class="post-text">${escapeHTML(post.text)}</p>
      ${imageHTML}
      ${editedHTML}
      <div class="post-footer">
        <time class="post-ts">${fullDate}</time>
      </div>
    `;

    // Listener único no card que detecta em qual botão foi clicado
    // (técnica chamada "event delegation")
    card.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button) return;

      const action = button.dataset.action;

      if (action === 'edit')      openEditModal(post.id, post.text);
      if (action === 'delete')    confirmAndDelete(post.id);
      if (action === 'lightbox')  UI.openLightbox(post.image);
      if (action === 'profile')   UI.activateTab('profile');
    });

    return card;
  }


  // ── Renderização ─────────────────────────────────────────────

  // Renderiza todos os posts no feed principal.
  // Chamada ao inicializar, publicar, editar ou excluir.
  function renderFeed() {
    const feedEl   = document.getElementById('feedList');
    const emptyEl  = document.getElementById('feedEmpty');
    const badgeEl  = document.getElementById('postBadge');
    const posts    = Storage.getPosts();

    feedEl.innerHTML = '';

    if (posts.length === 0) {
      emptyEl.classList.remove('hidden');
      badgeEl.textContent = '0 posts';
      return;
    }

    emptyEl.classList.add('hidden');
    badgeEl.textContent = `${posts.length} post${posts.length !== 1 ? 's' : ''}`;

    posts.forEach(post => feedEl.appendChild(createPostCard(post)));
  }

  // Renderiza os posts na aba de perfil.
  // Funciona da mesma forma que renderFeed, mas em outro container.
  function renderProfilePosts() {
    const container = document.getElementById('profileFeed');
    const emptyEl   = document.getElementById('profileEmpty');
    const posts     = Storage.getPosts();

    container.innerHTML = '';

    if (posts.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }

    emptyEl.classList.add('hidden');
    posts.forEach(post => container.appendChild(createPostCard(post)));
  }

  // Atualiza os números nos cards de estatísticas do perfil.
  function updateStats() {
    const posts = Storage.getPosts();

    // Total de posts
    const statPostsEl = document.getElementById('statPosts');
    if (statPostsEl) statPostsEl.textContent = posts.length;

    // Dias únicos com pelo menos um post
    // Set() elimina datas duplicadas automaticamente
    const uniqueDays  = new Set(posts.map(p => new Date(p.createdAt).toDateString()));
    const statDaysEl  = document.getElementById('statDays');
    if (statDaysEl) statDaysEl.textContent = uniqueDays.size;
  }


  // ── Ações de post ────────────────────────────────────────────

  // Lê o texto e a imagem pendente, cria o post e atualiza a tela.
  function handlePublish() {
    const input = document.getElementById('postInput');
    const text  = input.value.trim();

    if (!text) return;

    try {
      Storage.addPost(text, pendingImageUrl);

      // Limpa o compose
      input.value = '';
      clearPendingImage();
      updateCharCounter('charCount', input, 500);
      document.getElementById('btnPost').disabled = true;

      renderFeed();
      updateStats();
      UI.showToast('Postagem publicada! 🎉', 'ok');

      // Scrolla suavemente para o topo do feed para ver o novo post
      document.getElementById('feedList').scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      UI.showToast(err.message, 'err');
    }
  }

  // Abre o modal com o texto atual do post para edição.
  function openEditModal(postId, currentText) {
    editingPostId = postId;

    const textarea = document.getElementById('editTa');
    textarea.value = currentText;
    updateCharCounter('editCount', textarea, 500);

    UI.openModal();
    textarea.focus();
  }

  // Salva o texto editado no modal.
  function handleSaveEdit() {
    if (!editingPostId) return;

    const textarea = document.getElementById('editTa');
    const newText  = textarea.value.trim();

    if (!newText) {
      UI.showToast('O texto não pode estar vazio.', 'err');
      return;
    }

    Storage.editPost(editingPostId, newText);
    editingPostId = null;

    UI.closeModal();
    renderFeed();
    renderProfilePosts();
    UI.showToast('Postagem atualizada!', 'ok');
  }

  // Pede confirmação antes de excluir o post.
  function confirmAndDelete(postId) {
    const confirmed = window.confirm('Deseja excluir esta postagem? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    Storage.deletePost(postId);
    renderFeed();
    renderProfilePosts();
    updateStats();
    UI.showToast('Postagem excluída.', 'err');
  }


  // ── Imagem no compose ────────────────────────────────────────

  // Converte o arquivo selecionado para Base64 e mostra a pré-visualização.
  async function handleImageSelect(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      UI.showToast('Por favor, selecione apenas imagens.', 'err');
      return;
    }

    UI.showToast('Carregando imagem…');

    try {
      const dataUrl    = await Profile.readFileAsDataUrl(file);
      pendingImageUrl  = dataUrl;

      // Mostra a pré-visualização
      document.getElementById('composePreviewImg').src = dataUrl;
      document.getElementById('composeImgPreview').classList.remove('hidden');
      document.querySelector('.img-tool-btn').classList.add('has-image');

      UI.showToast('Imagem pronta para publicar!', 'ok');

    } catch (err) {
      console.error('Erro ao carregar imagem:', err);
      UI.showToast('Erro ao carregar a imagem.', 'err');
    }
  }

  // Remove a imagem pendente e limpa a pré-visualização.
  function clearPendingImage() {
    pendingImageUrl = null;

    const previewContainer = document.getElementById('composeImgPreview');
    const previewImg       = document.getElementById('composePreviewImg');
    const imgInput         = document.getElementById('imgInput');
    const imgToolBtn       = document.querySelector('.img-tool-btn');

    if (previewContainer) previewContainer.classList.add('hidden');
    if (previewImg)       previewImg.src = '';
    if (imgInput)         imgInput.value = '';  // permite selecionar o mesmo arquivo de novo
    if (imgToolBtn)       imgToolBtn.classList.remove('has-image');
  }


  // ── Contador de caracteres ───────────────────────────────────

  // Atualiza o contador e muda a cor conforme o limite se aproxima.
  // counterId → ID do elemento span que mostra o número
  // inputEl   → o textarea monitorado
  // maxLength → limite máximo de caracteres
  function updateCharCounter(counterId, inputEl, maxLength) {
    const counterEl = document.getElementById(counterId);
    if (!counterEl || !inputEl) return;

    const remaining = maxLength - inputEl.value.length;
    counterEl.textContent = remaining;

    counterEl.classList.remove('warn', 'danger');
    if (remaining <= 20) counterEl.classList.add('danger');
    else if (remaining <= 80) counterEl.classList.add('warn');
  }


  // ── API pública ──────────────────────────────────────────────

  return {
    renderFeed,
    renderProfilePosts,
    updateStats,
    handlePublish,
    openEditModal,
    handleSaveEdit,
    handleImageSelect,
    clearPendingImage,
    updateCharCounter,
  };

})();
