/*
  profile.js
  ----------
  Gerencia tudo relacionado ao perfil do usuário:
  - Exibir nome, bio, avatar e banner na tela
  - Upload de foto de perfil e banner (converte para Base64)
  - Abrir/fechar/salvar o formulário de edição

  Depende de: storage.js (deve ser carregado antes no HTML)
*/

const Profile = (() => {

  // ── Funções auxiliares ───────────────────────────────────────

  // Gera as iniciais do nome para usar como fallback do avatar.
  // Ex: "João da Silva" → "JS" | "Ana" → "A"
  function getInitials(name) {
    const words = (name || 'U').trim().split(/\s+/).filter(Boolean);

    if (words.length === 1) {
      return words[0][0].toUpperCase();
    }

    const firstLetter = words[0][0].toUpperCase();
    const lastLetter  = words[words.length - 1][0].toUpperCase();
    return firstLetter + lastLetter;
  }

  // Preenche um elemento de avatar com foto ou iniciais.
  // Se tiver foto, insere uma <img> dentro do elemento.
  // Se não tiver, coloca o texto com as iniciais.
  function fillAvatar(element, name, imageUrl) {
    if (!element) return;

    element.innerHTML = '';  // limpa conteúdo anterior

    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = `Foto de ${name}`;
      element.appendChild(img);
    } else {
      element.textContent = getInitials(name);
    }
  }

  // Lê um arquivo de imagem e retorna uma Promise com a Data URL (Base64).
  // Necessário para salvar imagens no localStorage.
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = event => resolve(event.target.result);
      reader.onerror = ()    => reject(new Error('Falha ao ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }


  // ── Sincronização da UI ──────────────────────────────────────

  // Atualiza todos os elementos visuais com os dados atuais do perfil.
  // Chamada sempre que o perfil muda (editar nome, trocar foto, etc.).
  function syncUI() {
    const profile = Storage.getProfile();

    // Avatar no compose box
    fillAvatar(
      document.getElementById('composeAva'),
      profile.name,
      profile.avatarUrl
    );

    // Avatar grande na aba de perfil
    fillAvatar(
      document.getElementById('profileAvaBig'),
      profile.name,
      profile.avatarUrl
    );

    // Nome e bio
    const nameEl = document.getElementById('pName');
    const bioEl  = document.getElementById('pBio');
    if (nameEl) nameEl.textContent = profile.name;
    if (bioEl)  bioEl.textContent  = profile.bio || '';

    // Banner: mostra a imagem se existir, esconde se não existir
    const bannerImg = document.getElementById('bannerImg');
    if (bannerImg) {
      if (profile.bannerUrl) {
        bannerImg.src = profile.bannerUrl;
        bannerImg.classList.remove('hidden');
      } else {
        bannerImg.src = '';
        bannerImg.classList.add('hidden');
      }
    }
  }


  // ── Formulário de edição ─────────────────────────────────────

  // Abre o formulário preenchido com os dados atuais.
  function openEditForm() {
    const profile = Storage.getProfile();

    document.getElementById('eName').value = profile.name;
    document.getElementById('eBio').value  = profile.bio || '';

    document.getElementById('editForm').classList.remove('hidden');
    document.getElementById('btnEditP').style.display = 'none';

    document.getElementById('eName').focus();
  }

  // Fecha o formulário sem salvar.
  function closeEditForm() {
    document.getElementById('editForm').classList.add('hidden');
    document.getElementById('btnEditP').style.display = '';
  }

  // Valida e salva as alterações de nome e bio.
  function saveEditForm() {
    const name = document.getElementById('eName').value.trim();
    const bio  = document.getElementById('eBio').value.trim();

    if (!name) {
      UI.showToast('O nome não pode estar vazio.', 'err');
      document.getElementById('eName').focus();
      return;
    }

    Storage.patchProfile({ name, bio });
    syncUI();
    closeEditForm();

    // Re-renderiza posts para atualizar o nome do autor nos cards
    Posts.renderFeed();
    Posts.renderProfilePosts();

    UI.showToast('Perfil atualizado!', 'ok');
  }


  // ── Upload de imagens ────────────────────────────────────────

  // Processa o arquivo selecionado e salva como avatar ou banner.
  // type deve ser 'avatar' ou 'banner'.
  async function handleImageUpload(file, type) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      UI.showToast('Por favor, selecione apenas imagens.', 'err');
      return;
    }

    UI.showToast('Carregando imagem…');

    try {
      const dataUrl = await readFileAsDataUrl(file);

      if (type === 'avatar') {
        Storage.patchProfile({ avatarUrl: dataUrl });
        UI.showToast('Foto de perfil atualizada! 📸', 'ok');
      } else {
        Storage.patchProfile({ bannerUrl: dataUrl });
        UI.showToast('Banner atualizado! 🖼️', 'ok');
      }

      syncUI();

    } catch (err) {
      console.error('Erro no upload:', err);
      UI.showToast(err.message || 'Erro ao carregar a imagem.', 'err');
    }
  }


  // ── API pública ──────────────────────────────────────────────

  return {
    get:               Storage.getProfile,
    getInitials,
    readFileAsDataUrl,
    fillAvatar,
    syncUI,
    openEditForm,
    closeEditForm,
    saveEditForm,
    handleImageUpload,
  };

})();
