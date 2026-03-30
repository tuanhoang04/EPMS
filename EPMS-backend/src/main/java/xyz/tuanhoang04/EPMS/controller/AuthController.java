package xyz.tuanhoang04.EPMS.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import xyz.tuanhoang04.EPMS.constant.Role;
import xyz.tuanhoang04.EPMS.dto.requests.LoginRequest;
import xyz.tuanhoang04.EPMS.dto.requests.RegisterRequest;
import xyz.tuanhoang04.EPMS.dto.requests.UpdateProfileRequest;
import xyz.tuanhoang04.EPMS.dto.responses.AuthResponse;
import xyz.tuanhoang04.EPMS.entity.User;
import xyz.tuanhoang04.EPMS.repository.UserRepository;
import xyz.tuanhoang04.EPMS.service.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmailAddress(request.getEmail())) {
            return ResponseEntity.badRequest().body("Email is already in use");
        }

        User user = new User();
        user.setEmailAddress(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.USER);

        userRepository.save(user);

        return ResponseEntity.ok("User created");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmailAddress(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = jwtService.generateToken(user);

        return ResponseEntity.ok(AuthResponse.builder()
                .token(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmailAddress())
                        .firstName(user.getFirstName())
                        .lastName(user.getLastName())
                        .role(user.getRole())
                        .build())
                .build());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserInfo> getCurrentUser(Authentication authentication) {
        User user = userRepository.findByEmailAddress(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmailAddress())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build());
    }

    @PutMapping("/profile")
    public ResponseEntity<AuthResponse.UserInfo> updateProfile(Authentication authentication, @RequestBody UpdateProfileRequest request) {
        User user = userRepository.findByEmailAddress(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());

        userRepository.save(user);

        return ResponseEntity.ok(AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmailAddress())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .role(user.getRole())
                .build());
    }
}
