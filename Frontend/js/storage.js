/*
  storage.js
  ----------
  Camada de persistência: toda leitura e escrita no localStorage fica aqui.
  Nenhum outro módulo deve acessar o localStorage diretamente.

  Isso tem uma vantagem prática: quando o projeto migrar para um banco de dados
  real (ex: MongoDB), só este arquivo precisa mudar.

  Estrutura dos dados salvos:
    ds_posts   → array de objetos { id, text, image, createdAt, editedAt }
    ds_profile → objeto { name, bio, avatarUrl, bannerUrl }

  Nota sobre imagens:
    Imagens são salvas como Base64 (Data URL) diretamente no localStorage.
    Isso funciona para protótipos, mas o localStorage tem limite de ~5MB.
    Em produção, as imagens iriam para um serviço como AWS S3 ou Cloudinary.
*/

const Storage = (() => {

  // Chaves do localStorage — centralizadas para evitar erros de digitação
  const KEYS = {
    POSTS:   'ds_posts',
    PROFILE: 'ds_profile',
  };

  // Perfil padrão exibido na primeira vez que o app é aberto
  const DEFAULT_PROFILE = {
    name:      'João da Silva',
    bio:       'Apaixonado por aprender. Sempre estudando algo novo a cada dia.',
    avatarUrl: null,
    bannerUrl: null,
  };


  // ── Posts ────────────────────────────────────────────────────

  // Retorna todos os posts salvos (array), mais recentes primeiro.
  // Se não houver nada salvo ou o JSON estiver corrompido, retorna [].
  function getPosts() {
    try {
      const saved = localStorage.getItem(KEYS.POSTS);
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error('Erro ao ler posts do localStorage:', err);
      return [];
    }
  }

  // Salva o array completo de posts no localStorage.
  // Função interna — use addPost, editPost ou deletePost.
  function savePosts(posts) {
    try {
      localStorage.setItem(KEYS.POSTS, JSON.stringify(posts));
    } catch (err) {
      console.error('Erro ao salvar posts:', err);
      throw new Error('Armazenamento cheio. Exclua alguns posts com imagens.');
    }
  }

  // Cria um novo post e insere no início da lista (mais recente primeiro).
  // Retorna o post criado.
  function addPost(text, imageDataUrl = null) {
    const posts = getPosts();

    const newPost = {
      id:        crypto.randomUUID(),    // ID único nativo do browser
      text:      text.trim(),
      image:     imageDataUrl,           // String Base64 ou null
      createdAt: new Date().toISOString(),
      editedAt:  null,
    };

    posts.unshift(newPost);  // unshift insere no início → mais novo fica primeiro
    savePosts(posts);

    return newPost;
  }

  // Atualiza o texto de um post existente e registra a data da edição.
  // Retorna o post atualizado, ou null se o ID não for encontrado.
  function editPost(id, newText) {
    const posts = getPosts();
    const index = posts.findIndex(post => post.id === id);

    if (index === -1) {
      console.warn('editPost: ID não encontrado:', id);
      return null;
    }

    posts[index].text     = newText.trim();
    posts[index].editedAt = new Date().toISOString();

    savePosts(posts);
    return posts[index];
  }

  // Remove um post pelo ID.
  function deletePost(id) {
    const posts         = getPosts();
    const postsWithout  = posts.filter(post => post.id !== id);
    savePosts(postsWithout);
  }


  // ── Perfil ───────────────────────────────────────────────────

  // Retorna o perfil salvo. Se não existir, retorna o DEFAULT_PROFILE.
  // O spread { ...DEFAULT_PROFILE, ...saved } garante que campos novos
  // adicionados no futuro tenham valor padrão em perfis antigos.
  function getProfile() {
    try {
      const saved = localStorage.getItem(KEYS.PROFILE);
      return saved
        ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
        : { ...DEFAULT_PROFILE };
    } catch (err) {
      console.error('Erro ao ler perfil:', err);
      return { ...DEFAULT_PROFILE };
    }
  }

  // Salva o perfil completo.
  function saveProfile(profile) {
    try {
      localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      throw new Error('Armazenamento cheio. A imagem pode ser muito grande.');
    }
  }

  // Atualiza campos específicos do perfil sem sobrescrever os outros.
  // Exemplo: patchProfile({ avatarUrl: '...' }) atualiza só o avatar.
  function patchProfile(fields) {
    const current = getProfile();
    const updated = { ...current, ...fields };
    saveProfile(updated);
    return updated;
  }


  // ── API pública ──────────────────────────────────────────────

  // Apenas os métodos desta lista ficam acessíveis fora do módulo.
  return {
    getPosts,
    addPost,
    editPost,
    deletePost,
    getProfile,
    saveProfile,
    patchProfile,
  };

})();
