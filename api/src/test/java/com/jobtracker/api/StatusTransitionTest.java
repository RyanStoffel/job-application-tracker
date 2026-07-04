package com.jobtracker.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobtracker.api.applications.ApplicationStatus;
import com.jobtracker.api.applications.ApplicationStatusEvent;
import com.jobtracker.api.applications.ApplicationStatusEventRepository;
import com.jobtracker.api.applications.JobApplication;
import com.jobtracker.api.applications.JobApplicationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class StatusTransitionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JobApplicationRepository jobApplicationRepository;

    @Autowired
    private ApplicationStatusEventRepository statusEventRepository;

    @Test
    void statusChangeAppendsEventAndUpdatesCurrentStatus() throws Exception {
        String signupBody = """
                {"email":"status-user@example.com","password":"password123","displayName":"Status User"}
                """;
        MvcResult signupResult = mockMvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signupBody))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(signupResult.getResponse().getContentAsString()).get("token").asText();

        String createBody = """
                {"companyName":"Beta Inc","jobTitle":"SWE","currentStatus":"saved"}
                """;
        MvcResult createResult = mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(createBody))
                .andExpect(status().isCreated())
                .andReturn();
        String id = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        String statusBody = """
                {"status":"applied","note":"Submitted application"}
                """;
        mockMvc.perform(post("/api/applications/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(statusBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStatus").value("applied"))
                .andExpect(jsonPath("$.statusHistory.length()").value(2))
                .andExpect(jsonPath("$.statusHistory[0].status").value("applied"))
                .andExpect(jsonPath("$.statusHistory[0].note").value("Submitted application"));

        UUID applicationId = UUID.fromString(id);

        JobApplication persisted = jobApplicationRepository.findById(applicationId).orElseThrow();
        assertThat(persisted.getCurrentStatus()).isEqualTo(ApplicationStatus.APPLIED);
        // Created as "saved" with no appliedAt; transitioning to "applied" should
        // auto-fill it since the user never recorded one manually.
        assertThat(persisted.getAppliedAt()).isNotNull();

        List<ApplicationStatusEvent> events = statusEventRepository.findByApplicationIdOrderByChangedAtDesc(applicationId);
        assertThat(events).hasSize(2);
        assertThat(events.get(0).getStatus()).isEqualTo(ApplicationStatus.APPLIED);
        assertThat(events.get(0).getNote()).isEqualTo("Submitted application");
        assertThat(events.get(1).getStatus()).isEqualTo(ApplicationStatus.SAVED);
    }
}
