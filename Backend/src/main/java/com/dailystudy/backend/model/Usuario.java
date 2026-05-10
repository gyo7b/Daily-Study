package com.dailystudy.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Usuario {
    //O Id garante que cada usuario tenha um registro proprio
    @Id
    //Um valor para o Id é gerado para cada registro inserido no banco.
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    //Long é utilizado para numeros inteiros, que perfomam melhor no banco
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String senha;
}
