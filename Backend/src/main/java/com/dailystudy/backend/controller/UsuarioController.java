package com.dailystudy.backend.controller;

import com.dailystudy.backend.dto.LoginDTO;
import com.dailystudy.backend.dto.UsuarioRegistro;
import com.dailystudy.backend.model.Usuario;
import com.dailystudy.backend.service.UsuarioService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;

    @PostMapping("/registro") // Mapeia a requisicao HTTP para criar um novo usuario no banco de dados
    public ResponseEntity<String> registrar(@Valid @RequestBody UsuarioRegistro dto) {
        usuarioService.registroUsuario(dto);

        return ResponseEntity.ok("Usuário registrado com sucesso!");
    }

    @PostMapping("/login")
    public ResponseEntity<String> login (@Valid @RequestBody LoginDTO dto) {
        String token = usuarioService.autenticar(dto);

        return ResponseEntity.ok(token);
    }

}
