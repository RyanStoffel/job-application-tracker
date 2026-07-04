package com.jobtracker.api.auth;

import com.jobtracker.api.auth.dto.AuthResponse;
import com.jobtracker.api.auth.dto.LoginRequest;
import com.jobtracker.api.auth.dto.SignupRequest;
import com.jobtracker.api.auth.dto.UserDto;
import com.jobtracker.api.common.exception.ConflictException;
import com.jobtracker.api.common.exception.InvalidCredentialsException;
import com.jobtracker.api.common.exception.NotFoundException;
import com.jobtracker.api.users.User;
import com.jobtracker.api.users.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse signup(SignupRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new ConflictException("Email is already registered");
        }

        User user = new User();
        user.setEmail(req.email().toLowerCase());
        user.setPasswordHash(passwordEncoder.encode(req.password()));
        user.setDisplayName(req.displayName());

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getId());
        return new AuthResponse(toDto(saved), token);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailIgnoreCase(req.email())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid email or password"));

        if (user.getPasswordHash() == null || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException("Invalid email or password");
        }

        String token = jwtService.generateToken(user.getId());
        return new AuthResponse(toDto(user), token);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return toDto(user);
    }

    private UserDto toDto(User user) {
        return new UserDto(user.getId().toString(), user.getEmail(), user.getDisplayName(), user.getAvatarUrl(), user.getCreatedAt());
    }
}
