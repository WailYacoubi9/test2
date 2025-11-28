#!/bin/bash

###############################################################################
# Tests basiques pour OAuth2 Device Flow
#
# Usage: ./tests/test-flow.sh
#
# Prérequis:
# - curl installé
# - Keycloak lancé sur http://localhost:8080
# - WebApp lancée sur https://localhost:3000
# - Device-app lancée sur http://localhost:4000
###############################################################################

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
KEYCLOAK_URL="http://localhost:8080"
WEBAPP_URL="https://localhost:3000"
DEVICE_URL="http://localhost:4000"
REALM="projetcis"

# Compteurs
PASSED=0
FAILED=0

# Fonctions helper
print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${CYAN}--- $1 ---${NC}"
    echo ""
}

test_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

test_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

# Banner
echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Tests basiques OAuth2 Device Flow                       ║${NC}"
echo -e "${CYAN}║   Projet CIS - Script Bash                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Keycloak accessible
print_section "TEST 1: Services disponibles"

if curl -s -f -m 5 "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" > /dev/null 2>&1; then
    test_success "Keycloak est accessible"
else
    test_fail "Keycloak non accessible"
fi

# Test 2: WebApp accessible
if curl -s -k -f -m 5 "$WEBAPP_URL/" > /dev/null 2>&1; then
    test_success "WebApp est accessible"
else
    test_fail "WebApp non accessible"
fi

# Test 3: Device-app accessible
HEALTH_CHECK=$(curl -s -m 5 "$DEVICE_URL/health" 2>/dev/null)
if echo "$HEALTH_CHECK" | grep -q '"status":"OK"'; then
    test_success "Device-app est accessible et répond correctement"
else
    test_fail "Device-app non accessible ou réponse incorrecte"
fi

# Test 4: /api/status retourne 404
print_section "TEST 2: Architecture - Routes supprimées"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "$DEVICE_URL/api/status" 2>/dev/null)
if [ "$HTTP_CODE" == "404" ]; then
    test_success "/api/status retourne 404 (correctement supprimé)"
else
    test_fail "/api/status devrait retourner 404 mais retourne $HTTP_CODE"
fi

# Test 5: WebApp /activate accessible
print_section "TEST 3: WebApp - Page d'activation"

HTTP_CODE=$(curl -s -k -o /dev/null -w "%{http_code}" -m 5 "$WEBAPP_URL/activate" 2>/dev/null)
if [ "$HTTP_CODE" == "200" ]; then
    test_success "Page /activate accessible (200)"
else
    test_fail "Page /activate retourne $HTTP_CODE au lieu de 200"
fi

# Test 6: WebApp /profile redirige sans auth
HTTP_CODE=$(curl -s -k -o /dev/null -w "%{http_code}" -m 5 "$WEBAPP_URL/profile" 2>/dev/null)
if [ "$HTTP_CODE" == "302" ] || [ "$HTTP_CODE" == "301" ]; then
    test_success "Page /profile redirige sans auth ($HTTP_CODE)"
else
    test_fail "Page /profile devrait rediriger mais retourne $HTTP_CODE"
fi

# Test 7: WebApp /devices redirige sans auth
HTTP_CODE=$(curl -s -k -o /dev/null -w "%{http_code}" -m 5 "$WEBAPP_URL/devices" 2>/dev/null)
if [ "$HTTP_CODE" == "302" ] || [ "$HTTP_CODE" == "301" ]; then
    test_success "Page /devices redirige sans auth ($HTTP_CODE)"
else
    test_fail "Page /devices devrait rediriger mais retourne $HTTP_CODE"
fi

# Test 8: Keycloak Device Flow endpoint configuré
print_section "TEST 4: Keycloak - Configuration Device Flow"

WELL_KNOWN=$(curl -s -m 5 "$KEYCLOAK_URL/realms/$REALM/.well-known/openid-configuration" 2>/dev/null)
if echo "$WELL_KNOWN" | grep -q "device_authorization_endpoint"; then
    test_success "Device Flow endpoint configuré dans Keycloak"
    DEVICE_ENDPOINT=$(echo "$WELL_KNOWN" | grep -o '"device_authorization_endpoint":"[^"]*"' | cut -d'"' -f4)
    test_info "   Endpoint: $DEVICE_ENDPOINT"
else
    test_fail "Device Flow endpoint non trouvé dans .well-known"
fi

# Résumé
print_section "RÉSUMÉ DES TESTS"

TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")
else
    SUCCESS_RATE="0.0"
fi

echo -e "${GREEN}✅ Tests réussis: $PASSED${NC}"
echo -e "${RED}❌ Tests échoués: $FAILED${NC}"
echo -e "${CYAN}📊 Taux de réussite: $SUCCESS_RATE%${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Certains services ne sont peut-être pas démarrés.${NC}"
    echo -e "${YELLOW}   Vérifiez que Keycloak, WebApp et Device-app sont lancés.${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}🎉 Tous les tests passent ! L'architecture est correcte.${NC}"
    echo ""
    exit 0
fi
