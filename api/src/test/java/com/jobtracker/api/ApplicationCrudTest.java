package com.jobtracker.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ApplicationCrudTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String token;

    @BeforeEach
    void signUpUser() throws Exception {
        String signupBody = """
                {"email":"crud-user@example.com","password":"password123","displayName":"Crud User"}
                """;
        MvcResult result = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andReturn();
        token = objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void createListGetUpdateAndDeleteApplication() throws Exception {
        String createBody = """
                {"companyName":"Acme Corp","jobTitle":"Backend Engineer","sourceUrl":null,
                 "locationText":"Remote","salaryText":"$120k","appliedAt":null,"currentStatus":"saved"}
                """;

        MvcResult createResult = mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.companyName").value("Acme Corp"))
                .andExpect(jsonPath("$.jobTitle").value("Backend Engineer"))
                .andExpect(jsonPath("$.source").value("manual"))
                .andExpect(jsonPath("$.currentStatus").value("saved"))
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andReturn();

        String id = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/api/applications").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(id));

        mockMvc.perform(get("/api/applications/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes").isArray())
                .andExpect(jsonPath("$.notes.length()").value(0))
                .andExpect(jsonPath("$.statusHistory").isArray())
                .andExpect(jsonPath("$.statusHistory.length()").value(1));

        String patchBody = """
                {"companyName":"Acme Corporation"}
                """;
        mockMvc.perform(patch("/api/applications/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(patchBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.companyName").value("Acme Corporation"))
                .andExpect(jsonPath("$.currentStatus").value("saved"));

        mockMvc.perform(delete("/api/applications/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/applications/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void creatingApplicationRequiresAuth() throws Exception {
        String createBody = """
                {"companyName":"Acme Corp","jobTitle":"Backend Engineer","currentStatus":"saved"}
                """;
        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createWithSavedStatusLeavesAppliedAtNull() throws Exception {
        String createBody = """
                {"companyName":"Delta LLC","jobTitle":"QA Engineer","currentStatus":"saved"}
                """;
        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.appliedAt").doesNotExist());
    }

    @Test
    void createWithAppliedStatusAutoFillsAppliedAt() throws Exception {
        String createBody = """
                {"companyName":"Epsilon Co","jobTitle":"Data Engineer","currentStatus":"applied"}
                """;
        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.appliedAt").isNotEmpty());
    }

    @Test
    void createWithMissingRequiredFieldReturnsValidationErrors() throws Exception {
        String createBody = """
                {"companyName":"","jobTitle":"","currentStatus":"saved"}
                """;
        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.companyName").exists())
                .andExpect(jsonPath("$.errors.jobTitle").exists());
    }
}
