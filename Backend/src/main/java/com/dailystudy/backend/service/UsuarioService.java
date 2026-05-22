package com.dailystudy.backend.service;

import com.dailystudy.backend.dto.LoginDTO;
import com.dailystudy.backend.dto.UsuarioRegistro;
import com.dailystudy.backend.model.Usuario;
import com.dailystudy.backend.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@RequiredArgsConstructor
@Service
public class UsuarioService {

    private final TokenService tokenService;

    private final UsuarioRepository usuarioRepository;

    private final BCryptPasswordEncoder passwordEncoder;

    public void registroUsuario(UsuarioRegistro dto) {

        if (usuarioRepository.findByEmail(dto.getEmail()).isPresent()) {
            return;
        }

        Usuario novoUsuario = new Usuario();
        novoUsuario.setUsername(dto.getUsername());
        novoUsuario.setEmail(dto.getEmail());
        novoUsuario.setSenha(passwordEncoder.encode(dto.getSenha()));

        usuarioRepository.save(novoUsuario);
    }

    public String autenticar(LoginDTO dto){
        Usuario usuario = usuarioRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário ou senha inválidos"));

        if (!passwordEncoder.matches(dto.getSenha(), usuario.getSenha())) {
            throw new RuntimeException("Usuário ou senha inválidos");
        }

        return tokenService.gerarToken(usuario);

    }
}
