package xyz.tuanhoang04.EPMS.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.tuanhoang04.EPMS.entity.User;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailAddress(String emailAddress);
    boolean existsByEmailAddress(String emailAddress);
}
