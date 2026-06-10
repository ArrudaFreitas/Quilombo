package com.quilombo.architecture;

import com.quilombo.common.api.ApiResponse;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.lang.ArchRule;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.tngtech.archunit.lang.conditions.ArchConditions.haveRawReturnType;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.methods;

/**
 * Garante a consistência do envelope: como o {@code ApiResponse} é aplicado
 * explicitamente nos controllers, este teste impede que algum handler devolva
 * um DTO cru por esquecimento.
 */
class ResponseEnvelopeArchTest {

    @Test
    void rest_controller_handlers_must_return_api_response_or_response_entity() {
        JavaClasses production = new ClassFileImporter()
                .withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
                .importPackages("com.quilombo");

        ArchRule rule = methods()
                .that().areDeclaredInClassesThat().areAnnotatedWith(RestController.class)
                .and().areMetaAnnotatedWith(RequestMapping.class)
                .should(haveRawReturnType(ApiResponse.class)
                        .or(haveRawReturnType(ResponseEntity.class)))
                .because("toda resposta de sucesso deve usar o envelope ApiResponse "
                        + "(diretamente ou dentro de um ResponseEntity)")
                // ainda não há controllers; a regra passa a valer quando o primeiro existir
                .allowEmptyShould(true);

        rule.check(production);
    }
}
