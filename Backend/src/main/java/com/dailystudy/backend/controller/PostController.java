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
@CrossOrigin(origins = "*")
public class PostController {
    
    @Autowired 
    private PostService postService;

    @Autowired  
    private CurtidaService curtidaService;

    @Autowired 
    private  TokenService tokenService;

    @PostMapping
    public ResponseEntity<Post> postar(@Valid @RequestBody PostCreateDTO dto, @AuthenticationPrincipal Usuario usuarioLogado) {
        if (!MediaValidator.isSafeImage(dto.mediaUrl())){
            return ResponseEntity.badRequest().build();
        }
        Post novoPost = postService.criarPost(dto, usuarioLogado.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(novoPost);
    }

    // ===== NOVOS ENDPOINTS PARA A SPRINT =====
    
    
    @GetMapping("/meus")
    public ResponseEntity<List<Post>> minhasPostagens(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ){
         if (authorizationHeader == null || authorizationHeader.isEmpty()){
            return ResponseEntity.status(401).build();
        }
     String token = authorizationHeader.replace("Bearer ", "");
    Long usuarioId = tokenService.extrairUsuarioId(token);
    if (usuarioId == null || usuarioId <= 0){
        return ResponseEntity.status(401).build();
    }
    List<Post> postagens = postService.obterPostagensDoUsuario(usuarioId);
    return ResponseEntity.ok(postagens);
    }
    
    @GetMapping("/minhas-respostas")
  public ResponseEntity<List<Post>> minhasRespostas(
          @RequestHeader(value = "Authorization", required = false) String authorizationHeader
  ) {
      if (authorizationHeader == null || authorizationHeader.isEmpty()) {
          return ResponseEntity.status(401).build();
      }
      String token = authorizationHeader.replace("Bearer ", "");
      Long usuarioId = tokenService.extrairUsuarioId(token);  // ← Novo método
      if (usuarioId == null || usuarioId <= 0) {
          return ResponseEntity.status(401).build();
      }
      List<Post> respostas = postService.obterRespostasDoUsuario(usuarioId);
      return ResponseEntity.ok(respostas);
  }


    @GetMapping("/{postId}/respostas")
    public ResponseEntity<List<Post>> obterRespostasDoPost(
        @PathVariable String postId
    ) {
        List<Post> respostas = postService.obterRespostasDePost(postId);
        return ResponseEntity.ok(respostas);
    }

    // ===== ENDPOINTS VELHOS(N MUDEI OPRRA) =====

    @PutMapping("/{id}")
    public ResponseEntity<Post> editarPost(@Valid @PathVariable String id, @RequestBody EditarPostDTO dto, @AuthenticationPrincipal Usuario usuarioLogado) {
        if (!MediaValidator.isSafeImage(dto.mediaUrl())){
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

    @GetMapping("/mine")
    public ResponseEntity<List<PostFeedDTO>> listarFeedAutor(@AuthenticationPrincipal Usuario usuarioLogado) {
        return ResponseEntity.ok(postService.listarFeedAutor(usuarioLogado.getId()));
    }

    @PostMapping("/{id}/curtida")
    public ResponseEntity<CurtidaDTO> curtir (@PathVariable String id, @AuthenticationPrincipal Usuario usuarioLogado){
        return ResponseEntity.ok(curtidaService.toggleCurtida(id, usuarioLogado.getId()));
    }

    @PostMapping("/{id}/comentarios")
    public ResponseEntity<Post> comentar(@Valid @PathVariable String id, @RequestBody ComentarioDTO dto, @AuthenticationPrincipal Usuario usuarioLogado){
        Post comentario = postService.criarComentario(id, dto, usuarioLogado.getId());
        return ResponseEntity.ok(comentario);
    }

    @GetMapping("/{id}/comentarios")
    public ResponseEntity<List<PostFeedDTO>> listarComentarios(
        @PathVariable String id,
        Authentication authentication
    ) {
        Long usuarioLogadoId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Usuario) {
            Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
            usuarioLogadoId = usuarioLogado.getId();
        }
        return ResponseEntity.ok(postService.listarComentarios(id, usuarioLogadoId));
    }

    @GetMapping("/{id}/detalhes")
    public ResponseEntity<PostDetalhesDTO> buscarDetalhes(
        @PathVariable String id,
        Authentication authentication
    ) {
        Long usuarioLogadoId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Usuario) {
            Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
            usuarioLogadoId = usuarioLogado.getId();
        }
        PostDetalhesDTO detalhes = postService.buscarDetalhes(id, usuarioLogadoId);
        return ResponseEntity.ok(detalhes);
    }

    @GetMapping
    public ResponseEntity<FeedPageDTO> listarPosts(
        @RequestParam(required = false) String cursor,
        @RequestParam(defaultValue = "20") @Max(50) int limit,
        Authentication authentication
    ) {
        Long usuarioLogadoId = null;
        if (authentication != null && authentication.getPrincipal() instanceof Usuario) {
            Usuario usuarioLogado = (Usuario) authentication.getPrincipal();
            usuarioLogadoId = usuarioLogado.getId();
        }
        return ResponseEntity.ok(postService.listarFeedCursor(cursor, limit, usuarioLogadoId));
    }
}