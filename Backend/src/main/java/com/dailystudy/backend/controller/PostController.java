package com.dailystudy.backend.controller;

import com.dailystudy.backend.dto.*;
import com.dailystudy.backend.model.Post;
import com.dailystudy.backend.model.Usuario;
import com.dailystudy.backend.service.CurtidaService;
import com.dailystudy.backend.service.PostService;
import com.dailystudy.backend.service.TokenService;
import com.dailystudy.backend.util.MediaValidator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor // ALt injecao or constructor no lugar do autowired
@CrossOrigin(origins = "*")
public class PostController {

     private final PostService postService;
     private final CurtidaService curtidaService;
    
    @PostMapping
    public ResponseEntity<Post> postar(@Valid @RequestBody PostCreateDTO dto, @AuthenticationPrincipal Usuario usuarioLogado) {
        if (!MediaValidator.isSafeImage(dto.mediaUrl())) {
            return ResponseEntity.badRequest().build();
        }
        Post novoPost = postService.criarPost(dto, usuarioLogado.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoPost);
    }

    
    @PutMapping("/{id}")
    public ResponseEntity<Post> editarPost(@PathVariable String id, @Valid @RequestBody EditarPostDTO dto, @AuthenticationPrincipal Usuario usuarioLogado) {
        // ALTERAÇÃO 7: @Valid movido para o @RequestBody (antes estava no @PathVariable, onde não tem efeito).
        if (!MediaValidator.isSafeImage(dto.mediaUrl())) {
            return ResponseEntity.badRequest().build();
        }
        Post post = postService.editarPost(id, dto, usuarioLogado.getId());
        return ResponseEntity.ok(post);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletarPost(@PathVariable String id, @AuthenticationPrincipal Usuario usuarioLogado) {
        postService.deletarPost(id, usuarioLogado.getId());
        return ResponseEntity.noContent().build();
    }

    // ALTERAÇÃO 8: /mine agora passa usuarioLogado.getId() como segundo argumento
    // (listarFeedAutor agora pede autorId e usuarioLogadoId).
    @GetMapping("/mine")
    public ResponseEntity<List<PostFeedDTO>> listarFeedAutor(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(postService.listarFeedAutor(usuarioLogado.getId(), usuarioLogado.getId()));
    }

    // ALTERAÇÃO 9: novo endpoint de postagens do usuário logado (substitui "/meus").
    @GetMapping("/mine/postagens")
    public ResponseEntity<List<PostFeedDTO>> minhasPostagens(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(postService.listarPostagensDoAutor(usuarioLogado.getId(), usuarioLogado.getId()));
    }

    // ALTERAÇÃO 10: novo endpoint de respostas do usuário logado (substitui "/minhas-respostas").
    @GetMapping("/mine/respostas")
    public ResponseEntity<List<PostFeedDTO>> minhasRespostas(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(postService.listarRespostasDoAutor(usuarioLogado.getId(), usuarioLogado.getId()));
    }

    @PostMapping("/{id}/curtida")
    public ResponseEntity<CurtidaDTO> curtir(@PathVariable String id, @AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(curtidaService.toggleCurtida(id, usuarioLogado.getId()));
    }

    @PostMapping("/{id}/comentarios")
    public ResponseEntity<Post> comentar(@PathVariable String id, @Valid @RequestBody ComentarioDTO dto, @AuthenticationPrincipal Usuario usuarioLogado) {
        // ALTERAÇÃO 11: @Valid movido para o @RequestBody (mesmo motivo da ALTERAÇÃO 7).
        Post comentario = postService.criarComentario(id, dto, usuarioLogado.getId());
        return ResponseEntity.ok(comentario);
    }

    @GetMapping("/{id}/comentarios")
    public ResponseEntity<List<PostFeedDTO>> listarComentarios(@PathVariable String id, Authentication authentication) {
        Long usuarioLogadoId = extrairUsuarioId(authentication);
        return ResponseEntity.ok(postService.listarComentarios(id, usuarioLogadoId));
    }

    @GetMapping("/{id}/detalhes")
    public ResponseEntity<PostDetalhesDTO> buscarDetalhes(@PathVariable String id, Authentication authentication) {
        Long usuarioLogadoId = extrairUsuarioId(authentication);
        return ResponseEntity.ok(postService.buscarDetalhes(id, usuarioLogadoId));
    }

    @GetMapping
    public ResponseEntity<FeedPageDTO> listarPosts(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit, // ALTERAÇÃO 12: removido @Max(50) (sem @Validated não tinha efeito)
            Authentication authentication
    ) {
        Long usuarioLogadoId = extrairUsuarioId(authentication);
        return ResponseEntity.ok(postService.listarFeedCursor(cursor, limit, usuarioLogadoId));
    }

    // ALTERAÇÃO 13: método auxiliar que substitui o bloco repetido de 3 linhas nos endpoints de leitura.
    private Long extrairUsuarioId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Usuario usuario) {
            return usuario.getId();
        }
        return null;
    }
}