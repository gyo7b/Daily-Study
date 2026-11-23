package com.dailystudy.backend.controller;

import com.dailystudy.backend.service.TokenService;
import com.dailystudy.backend.dto.*;
import com.dailystudy.backend.model.Usuario;
import com.dailystudy.backend.service.UsuarioService;
import com.dailystudy.backend.util.MediaValidator;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final TokenService tokenService;

    private static final String COOKIE_NAME = "access_token";
    private static final Duration COOKIE_MAX_AGE = Duration.ofHours(2);

    @PostMapping("/registro") // Mapeia a requisicao HTTP para criar um novo usuario no banco de dados
    public ResponseEntity<String> registrar(@Valid @RequestBody UsuarioRegistro dto) {
        usuarioService.registroUsuario(dto);

        return ResponseEntity.ok("Usuário registrado com sucesso!");
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login (@Valid @RequestBody LoginDTO dto) {
        String token = usuarioService.autenticar(dto);
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(){

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UsuarioResponseDTO> obterUsuarioLogado(@AuthenticationPrincipal Usuario usuarioLogado){
        if (usuarioLogado == null){
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(new UsuarioResponseDTO(usuarioLogado));
    }

    @PutMapping("/me/img_perfil")
    public ResponseEntity<Void> uploadImagemPerfil(@Valid @AuthenticationPrincipal Usuario usuarioLogado, @RequestBody ImagemPerfil dto){
        if (usuarioLogado == null){
            return ResponseEntity.status(401).build();
        }

        if (!MediaValidator.isSafeImage(dto.img_perfil())) {
            return ResponseEntity.badRequest().build();
        }

        usuarioService.atualizarImgPerfil(usuarioLogado.getId(), dto);

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/perfil")
    public ResponseEntity<Map<String, String>> editarPerfil(
        @AuthenticationPrincipal Usuario usuarioLogado,
        @Valid @RequestBody DadosPerfil dto) {

    if (usuarioLogado == null) {
        return ResponseEntity.status(401).build();
    }

    // Salva as alterações no banco
    usuarioService.atualizarDadosPerfil(usuarioLogado.getId(), dto);

    return ResponseEntity.noContent().build();

    }

    @GetMapping("/perfil/{username}")
    public ResponseEntity<PerfilPublicoDTO> listarPostsPorUsuarios
            (@PathVariable String username,
             @AuthenticationPrincipal Usuario visitante) {

        Long visitanteId = visitante != null ? visitante.getId() : null;


        return ResponseEntity.ok(usuarioService.buscarPerfilPublico(username, visitanteId));


    }

}
