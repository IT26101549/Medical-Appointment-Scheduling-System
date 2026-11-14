package com.medical.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Component
public class AdminLoginFilter extends OncePerRequestFilter {
    private static final String ADMIN = "hospital.admin";
    private static final String LOGIN_TOKEN = "hospital.loginToken";

    private final boolean demoMode;
    private final String username;
    private final byte[] password;
    private final String loginPage;

    public AdminLoginFilter(
            @Value("${HOSPITAL_DEMO_LOGIN:true}") boolean demoMode,
            @Value("${HOSPITAL_ADMIN_USERNAME:admin}") String username,
            @Value("${HOSPITAL_ADMIN_PASSWORD:}") String password) throws IOException {
        if (!demoMode && password.length() < 8) {
            throw new IllegalArgumentException("Set HOSPITAL_ADMIN_PASSWORD to at least eight characters before starting HospitalSystem.");
        }
        this.demoMode = demoMode;
        this.username = username;
        this.password = password.getBytes(StandardCharsets.UTF_8);
        try (var stream = new ClassPathResource("login.html").getInputStream()) {
            this.loginPage = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws IOException, ServletException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        boolean api = path.equals("/api") || path.startsWith("/api/");
        boolean signedIn = isSignedIn(request.getSession(false));

        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");

        if (path.equals("/login") && method.equals("GET")) {
            if (signedIn) {
                redirect(response, "/");
            } else {
                renderLogin(request, response, false);
            }
            return;
        }
        if (path.equals("/login") && method.equals("POST")) {
            signIn(request, response);
            return;
        }
        if (path.equals("/login.css") && (method.equals("GET") || method.equals("HEAD"))) {
            chain.doFilter(request, response);
            return;
        }
        if (!signedIn) {
            if (api) {
                jsonError(response, 401, "Sign in as admin to continue.");
            } else {
                redirect(response, "/login");
            }
            return;
        }
        // A cross-origin form cannot set this header. Cross-origin scripts have no CORS access.
        boolean write = !method.equals("GET") && !method.equals("HEAD") && !method.equals("OPTIONS");
        if (write && !"HospitalSystem".equals(request.getHeader("X-Hospital-Request"))) {
            jsonError(response, 403, "This action must come from the HospitalSystem page.");
            return;
        }
        if (path.equals("/logout")) {
            if (!method.equals("POST")) {
                response.setHeader("Allow", "POST");
                response.setStatus(405);
            } else {
                request.getSession(false).invalidate();
                response.setStatus(204);
            }
            return;
        }
        chain.doFilter(request, response);
    }

    private boolean isSignedIn(HttpSession session) {
        return session != null && Boolean.TRUE.equals(session.getAttribute(ADMIN));
    }

    private void signIn(HttpServletRequest request, HttpServletResponse response) throws IOException {
        HttpSession session = request.getSession(false);
        String token = request.getParameter("token");
        if (session == null || token == null || !token.equals(session.getAttribute(LOGIN_TOKEN))) {
            redirect(response, "/login");
            return;
        }
        String submittedUsername = request.getParameter("username");
        String submittedPassword = request.getParameter("password");
        if (!validCredentials(submittedUsername, submittedPassword)) {
            renderLogin(request, response, true);
            return;
        }
        request.changeSessionId();
        session.removeAttribute(LOGIN_TOKEN);
        session.setAttribute(ADMIN, true);
        redirect(response, "/");
    }

    private boolean validCredentials(String submittedUsername, String submittedPassword) {
        if (demoMode) {
            return submittedUsername != null && !submittedUsername.isBlank()
                    && submittedPassword != null && !submittedPassword.isBlank();
        }
        return username.equals(submittedUsername) && submittedPassword != null
                && MessageDigest.isEqual(password, submittedPassword.getBytes(StandardCharsets.UTF_8));
    }

    private void renderLogin(HttpServletRequest request, HttpServletResponse response, boolean failed)
            throws IOException {
        String token = UUID.randomUUID().toString();
        request.getSession().setAttribute(LOGIN_TOKEN, token);
        response.setStatus(failed ? 401 : 200);
        response.setContentType("text/html;charset=UTF-8");
        String error = demoMode ? "Enter a username and password." : "Incorrect username or password.";
        response.getWriter().write(loginPage.replace("{{TOKEN}}", token)
                .replace("{{DEMO}}", demoMode ? "<p>Demo mode. Enter any username and password.</p>" : "")
                .replace("{{ERROR}}", failed ? "<p class=\"login-error\" role=\"alert\">" + error + "</p>" : ""));
    }

    private void redirect(HttpServletResponse response, String path) {
        response.setStatus(303);
        response.setHeader("Location", path);
    }

    private void jsonError(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
