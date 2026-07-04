package com.jobtracker.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void signupThenLoginThenMe() throws Exception {
        String signupBody = """
                {"email":"auth-flow@example.com","password":"password123","displayName":"Auth Flow"}
                """;

        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("auth-flow@example.com"))
                .andExpect(jsonPath("$.user.displayName").value("Auth Flow"))
                .andExpect(jsonPath("$.token").isNotEmpty());

        String loginBody = """
                {"email":"auth-flow@example.com","password":"password123"}
                """;

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn();

        String token = objectMapper.readTree(loginResult.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("auth-flow@example.com"));
    }

    @Test
    void meWithoutTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void signupWithDuplicateEmailReturnsConflict() throws Exception {
        String body = """
                {"email":"dup-signup@example.com","password":"password123","displayName":"Dup"}
                """;

        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").exists());
    }

    @Test
    void loginWithWrongPasswordReturnsUnauthorized() throws Exception {
        String signupBody = """
                {"email":"bad-pass@example.com","password":"correct-password","displayName":"Bad Pass"}
                """;
        mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated());

        String loginBody = """
                {"email":"bad-pass@example.com","password":"wrong-password"}
                """;
        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginBody))
                .andExpect(status().isUnauthorized());
    }
}
