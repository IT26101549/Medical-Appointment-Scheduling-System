package com.medical.auth;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminLoginFilterTest {
    private static final Pattern FORM_TOKEN = Pattern.compile("name=\"token\" value=\"([^\"]+)\"");

    @Test
    void loginFormRemainsValidWhenOpenedInAnotherTab() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup()
                .addFilters(new AdminLoginFilter(true, "admin", ""))
                .build();
        MvcResult firstTab = mvc.perform(get("/login")).andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) firstTab.getRequest().getSession(false);
        String token = formToken(firstTab);

        MvcResult secondTab = mvc.perform(get("/login").session(session))
                .andExpect(status().isOk()).andReturn();
        assertEquals(token, formToken(secondTab));

        mvc.perform(post("/login").session(session).param("token", "outdated")
                        .param("username", "admin").param("password", "demo123"))
                .andExpect(status().isSeeOther())
                .andExpect(redirectedUrl("/login?expired=1"));

        MvcResult refreshed = mvc.perform(get("/login?expired=1").session(session))
                .andExpect(status().isOk()).andReturn();
        assertEquals(token, formToken(refreshed));
        assertTrue(refreshed.getResponse().getContentAsString().contains("Use this refreshed form"));

        mvc.perform(post("/login").session(session).param("token", token)
                        .param("username", "admin").param("password", "demo123"))
                .andExpect(status().isSeeOther())
                .andExpect(redirectedUrl("/"));
        mvc.perform(get("/login").session(session)).andExpect(redirectedUrl("/"));
    }

    private String formToken(MvcResult page) throws Exception {
        var match = FORM_TOKEN.matcher(page.getResponse().getContentAsString());
        assertTrue(match.find());
        return match.group(1);
    }
}
