package com.jobtracker.api.common.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LocationParserTest {

    @Test
    void parsesCityRegionAndInfersUsCountryFromStateCode() {
        LocationParser.Result result = LocationParser.parse("Los Angeles, CA");
        assertThat(result.city()).isEqualTo("Los Angeles");
        assertThat(result.region()).isEqualTo("CA");
        assertThat(result.country()).isEqualTo("United States");
        assertThat(result.isRemote()).isNull();
    }

    @Test
    void detectsRemoteKeywordAndStripsItFromCityParsing() {
        LocationParser.Result result = LocationParser.parse("Austin, TX (Remote)");
        assertThat(result.city()).isEqualTo("Austin");
        assertThat(result.region()).isEqualTo("TX");
        assertThat(result.isRemote()).isTrue();
    }

    @Test
    void handlesRemoteOnlyText() {
        LocationParser.Result result = LocationParser.parse("Remote");
        assertThat(result.city()).isNull();
        assertThat(result.isRemote()).isTrue();
    }

    @Test
    void returnsAllNullsForBlankInput() {
        LocationParser.Result result = LocationParser.parse(null);
        assertThat(result.city()).isNull();
        assertThat(result.region()).isNull();
        assertThat(result.country()).isNull();
        assertThat(result.isRemote()).isNull();
    }

    @Test
    void neverThrowsOnGarbageInput() {
        LocationParser.Result result = LocationParser.parse(",,, ()( ---");
        assertThat(result).isNotNull();
    }
}
