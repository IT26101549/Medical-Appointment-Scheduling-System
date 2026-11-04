package com.medical.doctormanagement.validation;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class InputValidationTest {
    @ParameterizedTest
    @ValueSource(strings = {"0771234567", "+94771234567", " 0712345678 "})
    void acceptsSupportedSriLankanMobileFormats(String phone) {
        assertEquals(phone.trim(), InputValidation.phone(phone));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"12345", "0112345678", "077 123 4567", "+947712345678", "077123456X"})
    void rejectsInvalidMobileNumbers(String phone) {
        assertThrows(IllegalArgumentException.class, () -> InputValidation.phone(phone));
    }

    @ParameterizedTest
    @ValueSource(strings = {"doctor@example.com", "  first.last+clinic@example.lk  "})
    void acceptsAndTrimsEmail(String email) {
        assertEquals(email.trim(), InputValidation.email(email));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"doctor", "doctor@", "doctor@example", "first..last@example.com", "name with spaces@example.com"})
    void rejectsMalformedEmail(String email) {
        assertThrows(IllegalArgumentException.class, () -> InputValidation.email(email));
    }

    @Test
    void rejectsEmailLongerThan254Characters() {
        assertThrows(IllegalArgumentException.class, () -> InputValidation.email("a".repeat(250) + "@example.com"));
    }
}
