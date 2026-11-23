package com.dailystudy.backend.service;

import com.dailystudy.backend.exception.CredenciaisInvalidasException;
import com.dailystudy.backend.model.*;
import com.dailystudy.backend.repository.PostRepository;

import java.util.HashMap;
import java.util.List;
import com.dailystudy.backend.dto.*;
import com.dailystudy.backend.repository.UsuarioRepository;
import com.dailystudy.backend.exception.UsuarioException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import javax.swing.undo.CannotRedoException;
import java.util.List;
import java.util.Map;

@Slf4j
@RequiredArgsConstructor
@Service
public class UsuarioService {

    private final IndexadorService indexadorService;

    private final TokenService tokenService;

    private final UsuarioRepository usuarioRepository;

    private final BCryptPasswordEncoder passwordEncoder;

    private final PostService postService;

    public void registroUsuario(UsuarioRegistro dto) {

        if (usuarioRepository.findByEmail(dto.getEmail()).isPresent()) {
            log.warn("Registro recusado: email já cadastrado (email={})", dto.getEmail());
            throw new UsuarioException("Email inválido");
        }

        if (usuarioRepository.findByUsername(dto.getUsername()).isPresent()){
            log.warn("Registro recusado: username já está em uso (username={})", dto.getUsername());
            throw new UsuarioException("Este nome já está em uso");
        }

        Usuario novoUsuario = new Usuario();
        novoUsuario.setUsername(dto.getUsername());
        novoUsuario.setEmail(dto.getEmail());
        novoUsuario.setSenha(passwordEncoder.encode(dto.getSenha()));
        novoUsuario.setRole(UsuarioRole.USER);

        usuarioRepository.save(novoUsuario);

        indexadorService.reindexar(String.valueOf(novoUsuario.getId()), TipoReferencia.USUARIO, Map.of(CampoIndexado.USERNAME, novoUsuario.getUsername()));

        log.info("Novo usuário registrado: username={}", novoUsuario.getUsername());
    }

    public String autenticar(LoginDTO dto) {
        Usuario usuario = usuarioRepository.findByEmail(dto.getEmail())
                .orElseThrow(() -> {
                    log.warn("Falha de login: email não encontrado (email={})", dto.getEmail());
                    return new CredenciaisInvalidasException("Usuário ou senha inválidos");
                });

        if (!passwordEncoder.matches(dto.getSenha(), usuario.getSenha())) {
            log.warn("Falha de login: senha incorreta (email={})", dto.getEmail());
            throw new CredenciaisInvalidasException("Usuário ou senha inválidos");
        }

        log.info("Login efetuado: email={}, username={}", dto.getEmail(), usuario.getUsername());

        return tokenService.gerarToken(usuario);

    }
      // Gui - Criei um metodo auxiliar para buscar o user por id
    public Usuario buscarPorId(Long id) {
     return usuarioRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
}


    public void atualizarImgPerfil(Long id, ImagemPerfil dto) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
        usuario.setImg_perfil(dto.img_perfil());
        usuario.setBanner_perfil(dto.banner_perfil());

        usuarioRepository.save(usuario);
    }

    public void atualizarDadosPerfil(Long id, DadosPerfil dto) {
    Usuario usuario = usuarioRepository.findById(id)
            .orElseThrow(() -> new UsernameNotFoundException("Usuario não encontrado"));

    if (!usuario.getUsername().equals(dto.username())
            && usuarioRepository.findByUsername(dto.username()).isPresent()) {
        throw new UsuarioException("Este nome de usuário já está em uso");
    }

    usuario.setUsername(dto.username());
    usuario.setCargo(dto.cargo());
    usuario.setBio(dto.bio());

    usuarioRepository.save(usuario);

    indexadorService.reindexar(String.valueOf(usuario.getId()), TipoReferencia.USUARIO, construirCamposIndexaveis(usuario));

    }

    public PerfilPublicoDTO buscarPerfilPublico(String username, Long visitanteId) {
        Usuario usuario = usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));

        List<PostFeedDTO> posts = postService.listarFeedAutor(usuario.getId(), visitanteId);

        return new PerfilPublicoDTO(
                usuario.getUsername(),
                usuario.getImg_perfil(),
                usuario.getBanner_perfil(),
                usuario.getCargo(),
                usuario.getBio(),
                posts
        );
    }

    // Criamos esse HashMap pois nem sempre o usuario tem Cargo e Bio, podem ser brancos
    // e o Map não aceita null, HashMaps aceitam
    private Map<CampoIndexado, String> construirCamposIndexaveis(Usuario usuario) {
        Map<CampoIndexado, String> campos = new HashMap<>();
        campos.put(CampoIndexado.USERNAME, usuario.getUsername());

        if (usuario.getCargo() != null) {
            campos.put(CampoIndexado.CARGO, usuario.getCargo());
        }

        if (usuario.getBio() != null) {
            campos.put(CampoIndexado.BIO, usuario.getBio());
        }

        return campos;
    }
}