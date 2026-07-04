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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
                // appliedAt is auto-filled to capture time; postedAt is separate and
                // wasn't supplied in this request, so it stays null.
                .andExpect(jsonPath("$.appliedAt").isNotEmpty())
                .andExpect(jsonPath("$.postedAt").doesNotExist())
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

    @Test
    void genericCaptureCreatesOtherSourceApplication() throws Exception {
        String signupBody = """
                {"email":"generic-user@example.com","password":"password123","displayName":"Generic User"}
                """;
        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("token").asText();

        String captureBody = """
                {"sourceUrl":"https://boards.greenhouse.io/example/jobs/12345",
                 "companyName":"Zeta Corp","jobTitle":"Site Reliability Engineer",
                 "locationText":"Austin, TX (Remote)","salaryText":"$150,000 - $190,000/yr"}
                """;
        mockMvc.perform(post("/api/integrations/capture")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(captureBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("other"))
                .andExpect(jsonPath("$.currentStatus").value("applied"))
                .andExpect(jsonPath("$.isRemote").value(true))
                .andExpect(jsonPath("$.locationCity").value("Austin"))
                .andExpect(jsonPath("$.salaryMin").value(150000))
                .andExpect(jsonPath("$.salaryMax").value(190000))
                .andExpect(jsonPath("$.salaryPeriod").value("yearly"));
    }

    @Test
    void repostUnderNewUrlIsFlaggedAsPossibleDuplicateNotBlocked() throws Exception {
        String signupBody = """
                {"email":"repost-user@example.com","password":"password123","displayName":"Repost User"}
                """;
        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("token").asText();

        String firstIngestBody = """
                {"sourceUrl":"https://www.linkedin.com/jobs/view/55501",
                 "companyName":"Omega Systems","jobTitle":"Senior Backend Engineer",
                 "locationText":null,"salaryText":null,"postedAt":null}
                """;
        MvcResult first = mockMvc.perform(post("/api/integrations/linkedin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(firstIngestBody))
                .andExpect(status().isCreated())
                .andReturn();
        String firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asText();

        // Same company + title, reposted under a brand new URL weeks later -
        // should still be created (not blocked/merged), just flagged.
        String repostIngestBody = """
                {"sourceUrl":"https://www.linkedin.com/jobs/view/99902",
                 "companyName":"Omega Systems","jobTitle":"Senior Backend Engineer",
                 "locationText":null,"salaryText":null,"postedAt":null}
                """;
        MvcResult repost = mockMvc.perform(post("/api/integrations/linkedin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(repostIngestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.duplicateOfId").value(firstId))
                .andReturn();

        assertThat(objectMapper.readTree(repost.getResponse().getContentAsString()).get("id").asText())
                .isNotEqualTo(firstId);

        mockMvc.perform(get("/api/applications").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void editingCompanyOrTitleRecomputesDuplicateFlag() throws Exception {
        String signupBody = """
                {"email":"edit-dup-user@example.com","password":"password123","displayName":"Edit Dup User"}
                """;
        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("token").asText();

        String firstIngestBody = """
                {"sourceUrl":"https://www.linkedin.com/jobs/view/70001",
                 "companyName":"Kappa Systems","jobTitle":"Staff Engineer",
                 "locationText":null,"salaryText":null,"postedAt":null}
                """;
        MvcResult first = mockMvc.perform(post("/api/integrations/linkedin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(firstIngestBody))
                .andExpect(status().isCreated())
                .andReturn();
        String firstId = objectMapper.readTree(first.getResponse().getContentAsString()).get("id").asText();

        // A second, unrelated application - not a duplicate of anything yet.
        String secondIngestBody = """
                {"sourceUrl":"https://www.linkedin.com/jobs/view/70002",
                 "companyName":"Kappa Systemz","jobTitle":"Staff Engineer",
                 "locationText":null,"salaryText":null,"postedAt":null}
                """;
        MvcResult second = mockMvc.perform(post("/api/integrations/linkedin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(secondIngestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.duplicateOfId").doesNotExist())
                .andReturn();
        String secondId = objectMapper.readTree(second.getResponse().getContentAsString()).get("id").asText();

        // Fixing a typo in the company name now makes it collide with the first record.
        String patchBody = """
                {"companyName":"Kappa Systems"}
                """;
        mockMvc.perform(patch("/api/applications/" + secondId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(patchBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicateOfId").value(firstId));

        // Renaming the title so it no longer collides clears the flag again.
        String patchBody2 = """
                {"jobTitle":"Staff Engineer II"}
                """;
        mockMvc.perform(patch("/api/applications/" + secondId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(patchBody2))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.duplicateOfId").doesNotExist());
    }
}
