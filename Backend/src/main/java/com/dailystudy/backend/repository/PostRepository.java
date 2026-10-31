package com.dailystudy.backend.repository;

import com.dailystudy.backend.model.Post;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface PostRepository extends MongoRepository<Post, String>, PostRepositoryCustom {

    //  metodos 
    List<Post> findByComentPostIdIsNullOrderByDataCriacaoDesc();
    List<Post> findByAutorIdOrderByDataCriacaoDesc(Long autorId);
    long countByComentPostId(String comentPostId);

    List<Post> findByAutorAndComentPostIdIsNullOrderByDataCriacaoDesc(Long autorId);
    List<Post> findByAutorAndComentPostIdIsNotNullOrderByDataCriacaoDesc(Long autorId);
    List<Post> findByComentPostIdOrderByDataCriacaoDesc(String comentPostId); 

    
}
