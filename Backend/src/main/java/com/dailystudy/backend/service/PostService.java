package com.dailystudy.backend.service;

import com.dailystudy.backend.dto.*;
import com.dailystudy.backend.exception.PermissaoNegadaException;
import com.dailystudy.backend.model.CampoIndexado;
import com.dailystudy.backend.model.Curtida;
import com.dailystudy.backend.model.Post;
import com.dailystudy.backend.model.TipoReferencia;
import com.dailystudy.backend.model.Usuario;
import com.dailystudy.backend.repository.*;
import com.dailystudy.backend.util.CursorCodec;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;
    private final IndexadorService indexadorService;
    private final UsuarioRepository usuarioRepository;
    private final CurtidaRepository curtidaRepository;

    public Post criarPost(PostCreateDTO dto, Long autorId) {
        Post post = new Post();
        post.setContent(dto.content());
        post.setMediaUrl(dto.mediaUrl());
        post.setAutorId(autorId);
        post.setDataCriacao(Instant.now());
        post.setComentPostId(null);

        Post salvo = postRepository.save(post);
        indexadorService.reindexar(salvo.getId(), TipoReferencia.POST, Map.of(CampoIndexado.CONTEUDO, salvo.getContent()));
        log.info("Post criado: id={}, autorId={}", salvo.getId(), autorId);
        return salvo;
    }

    public Post editarPost(String id, EditarPostDTO dto, Long autorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Edicao falhou: post não encontrado (id={})", id);
                    return new RuntimeException("Post não encontrado");
                });

        if (!post.getAutorId().equals(autorId)) {
            log.warn("Edicao falhou: autorId={} tentou editar post de outro usuario (postId={}, donoReal={})", autorId, id, post.getAutorId());
            throw new PermissaoNegadaException("Não pode editar esse post");
        }

        post.setContent(dto.content());
        post.setMediaUrl(dto.mediaUrl());
        post.setDataEdicao(Instant.now());

        Post salvo = postRepository.save(post);
        indexadorService.reindexar(salvo.getId(), TipoReferencia.POST, Map.of(CampoIndexado.CONTEUDO, salvo.getContent()));
        return salvo;
    }

    public void deletarPost(String id, Long autorId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Deletar post falhou: post não encontrado (id={})", id);
                    return new RuntimeException("Post não encontrado");
                });

        if (!post.getAutorId().equals(autorId)) {
            log.warn("Deletar post falhou: autorId={} tentou deletar post de outro usuário (postId={}, donoReal={})", autorId, id, post.getAutorId());
            throw new PermissaoNegadaException("Não pode deletar esse post");
        }

        postRepository.deleteById(id);
        indexadorService.removerIndice(id);
        log.info("Post deletado: id={}, autorId={}", id, autorId);
    }

    public Post criarComentario(String comentPostId, ComentarioDTO dto, Long autorId) {
        postRepository.findById(comentPostId)
                .orElseThrow(() -> {
                    log.warn("Comentário falhou: post não encontrado (id={})", comentPostId);
                    return new RuntimeException("Post não encontrado");
                });

        Post comentario = new Post();
        comentario.setContent(dto.content());
        comentario.setMediaUrl(dto.mediaUrl());
        comentario.setDataCriacao(Instant.now());
        comentario.setComentPostId(comentPostId);
        comentario.setAutorId(autorId);

        Post salvo = postRepository.save(comentario);
        indexadorService.reindexar(salvo.getId(), TipoReferencia.COMENTARIO, Map.of(CampoIndexado.CONTEUDO, salvo.getContent()));
        return salvo;
    }

    // ── Listagens ────────────────────────────────────────────────
   
    public List<PostFeedDTO> listarFeedAutor(Long autorId, Long usuarioLogadoId) {
        return mapearFeedDTO(postRepository.findByAutorIdOrderByDataCriacaoDesc(autorId), usuarioLogadoId);
    }

    public List<PostFeedDTO> listarPostagensDoAutor(Long autorId, Long usuarioLogadoId) {
        return mapearFeedDTO(
                postRepository.findByAutorIdAndComentPostIdIsNullOrderByDataCriacaoDesc(autorId),
                usuarioLogadoId);
    }

    public List<PostFeedDTO> listarRespostasDoAutor(Long autorId, Long usuarioLogadoId) {
        return mapearFeedDTO(
                postRepository.findByAutorIdAndComentPostIdIsNotNullOrderByDataCriacaoDesc(autorId),
                usuarioLogadoId);
    }

    public List<PostFeedDTO> listarComentarios(String comentPostId, Long usuarioLogadoId) {
        return mapearFeedDTO(
                postRepository.findByComentPostIdOrderByDataCriacaoDesc(comentPostId),
                usuarioLogadoId);
    }

    // ── Mapeamento ───────────────────────────────────────────────

    private List<PostFeedDTO> mapearFeedDTO(List<Post> posts, Long usuarioLogadoId) {
        if (posts.isEmpty()) {
            return List.of();
        }

        List<Long> autorIds = posts.stream()
                .map(Post::getAutorId)
                .distinct()
                .toList();

        List<String> postIds = posts.stream()
                .map(Post::getId)
                .toList();

        Map<Long, Usuario> autoresPorId = usuarioRepository.findAllById(autorIds).stream()
                .collect(Collectors.toMap(Usuario::getId, Function.identity()));

        Map<String, Long> curtidasPorPost = curtidaRepository.countGroupedByPostId(postIds);
        Map<String, Long> comentariosPorPost = postRepository.countGroupedByComentPostId(postIds);

        Set<String> curtidosPeloUsuario = new HashSet<>();
        if (usuarioLogadoId != null) {
            curtidaRepository.findAllByPostIdInAndAutorId(postIds, usuarioLogadoId)
                    .forEach(curtida -> curtidosPeloUsuario.add(curtida.getPostId()));
        }

        return posts.stream().map(post -> {
            Usuario autor = autoresPorId.get(post.getAutorId());
            String autorNome = autor != null ? autor.getUsername() : "Usuário removido";
            String autorFoto = autor != null ? autor.getImg_perfil() : null;

            long totalCurtidas = curtidasPorPost.getOrDefault(post.getId(), 0L);
            long totalComentarios = comentariosPorPost.getOrDefault(post.getId(), 0L);
            boolean curtidoPeloUsuario = curtidosPeloUsuario.contains(post.getId());

            return new PostFeedDTO(post, autorNome, autorFoto, totalCurtidas, totalComentarios, curtidoPeloUsuario);
        }).toList();
    }

    // ── Detalhes e feed paginado ─────────────────────────────────

    public PostDetalhesDTO buscarDetalhes(String id, Long usuarioLogadoId) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Post não encontrado"));

        PostFeedDTO postDTO = mapearFeedDTO(List.of(post), usuarioLogadoId).get(0);
        List<PostFeedDTO> comentariosDTO = listarComentarios(id, usuarioLogadoId);

        return new PostDetalhesDTO(postDTO, comentariosDTO);
    }

    public FeedPageDTO listarFeedCursor(String cursorCodificado, int limit, Long usuarioLogadoId) {
        var cursor = CursorCodec.decode(cursorCodificado);

        List<Post> posts = postRepository.ordenarFeedCursor(
                cursor != null ? cursor.dataCriacao() : null,
                cursor != null ? cursor.id() : null,
                limit
        );

        boolean hasMore = posts.size() > limit;
        List<Post> pagina = hasMore ? posts.subList(0, limit) : posts;
        List<PostFeedDTO> dtos = mapearFeedDTO(pagina, usuarioLogadoId);

        String nextCursor = null;
        if (hasMore) {
            Post ultimo = pagina.get(pagina.size() - 1);
            nextCursor = CursorCodec.encode(ultimo.getDataCriacao(), ultimo.getId());
        }

        return new FeedPageDTO(dtos, nextCursor, hasMore);
    }
}