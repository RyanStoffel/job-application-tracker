package com.jobtracker.api.common.util;

import com.jobtracker.api.applications.SalaryPeriod;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class SalaryParserTest {

    @Test
    void parsesDollarRangeAsYearlyByDefault() {
        SalaryParser.Result result = SalaryParser.parse("$140,000 - $180,000");
        assertThat(result.min()).isEqualByComparingTo(BigDecimal.valueOf(140000));
        assertThat(result.max()).isEqualByComparingTo(BigDecimal.valueOf(180000));
        assertThat(result.currency()).isEqualTo("USD");
        assertThat(result.period()).isEqualTo(SalaryPeriod.YEARLY);
    }

    @Test
    void parsesHourlyRateWithUnitSuffix() {
        SalaryParser.Result result = SalaryParser.parse("$70/hr");
        assertThat(result.min()).isEqualByComparingTo(BigDecimal.valueOf(70));
        assertThat(result.max()).isEqualByComparingTo(BigDecimal.valueOf(70));
        assertThat(result.period()).isEqualTo(SalaryPeriod.HOURLY);
    }

    @Test
    void parsesKSuffixAndEuroCurrency() {
        SalaryParser.Result result = SalaryParser.parse("€60k - €80k");
        assertThat(result.min()).isEqualByComparingTo(BigDecimal.valueOf(60000));
        assertThat(result.max()).isEqualByComparingTo(BigDecimal.valueOf(80000));
        assertThat(result.currency()).isEqualTo("EUR");
    }

    @Test
    void returnsAllNullsWhenNoAmountFound() {
        SalaryParser.Result result = SalaryParser.parse("Competitive salary");
        assertThat(result.min()).isNull();
        assertThat(result.max()).isNull();
        assertThat(result.period()).isNull();
    }

    @Test
    void returnsAllNullsForBlankInput() {
        SalaryParser.Result result = SalaryParser.parse(null);
        assertThat(result.min()).isNull();
        assertThat(result.currency()).isNull();
    }
}
