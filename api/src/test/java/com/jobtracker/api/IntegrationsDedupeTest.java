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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class IntegrationsDedupeTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void secondIngestOfSameCanonicalUrlIsIdempotent() throws Exception {
        String signupBody = """
                {"email":"linkedin-user@example.com","password":"password123","displayName":"LinkedIn User"}
                """;
        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("token").asText();

        String ingestBody1 = """
                {"sourceUrl":"https://www.linkedin.com/jobs/view/12345?trk=abc&refId=xyz",
                 "companyName":"Gamma LLC","jobTitle":"Platform Engineer","locationText":"NYC",
                 "salaryText":null,"postedAt":null}
                """;
        MvcResult first = mockMvc.perform(post("/api/integrations/linkedin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(ingestBody1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("linkedin"))
                .andExpect(jsonPath("$.currentStatus").value("applied"))
                .andExpect(jsonPath("$.sourceUrl").value("https://www.linkedin.com/jobs/view/12345"))
                .andReturn();
        String firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asText();

        // Same listing, different query string and a fragment - should canonicalize to the same URL.
        String ingestBody2 = """
                {"sourceUrl":"https://www.linkedin.com/jobs/view/12345?trk=different&other=1#section",
                 "companyName":"Gamma LLC","jobTitle":"Platform Engineer","locationText":"NYC",
                 "salaryText":null,"postedAt":null}
                """;
        MvcResult second = mockMvc.perform(post("/api/integrations/linkedin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(ingestBody2))
                .andExpect(status().isOk())
                .andReturn();
        String secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asText();

        assertThat(secondId).isEqualTo(firstId);

        mockMvc.perform(get("/api/applications").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
