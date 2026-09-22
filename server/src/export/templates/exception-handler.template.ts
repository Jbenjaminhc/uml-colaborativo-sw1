export function generateGlobalExceptionHandler(packageName: string): string {
  const lines: string[] = [];
  lines.push(`package ${packageName};`);
  lines.push('');
  lines.push('import org.springframework.dao.DataIntegrityViolationException;');
  lines.push('import org.springframework.http.HttpStatus;');
  lines.push('import org.springframework.http.ResponseEntity;');
  lines.push(
    'import org.springframework.web.bind.annotation.ExceptionHandler;'
  );
  lines.push(
    'import org.springframework.web.bind.annotation.RestControllerAdvice;'
  );
  lines.push('import jakarta.persistence.EntityNotFoundException;');
  lines.push('');
  lines.push('import java.util.HashMap;');
  lines.push('import java.util.Map;');
  lines.push('');
  lines.push('@RestControllerAdvice');
  lines.push('public class GlobalExceptionHandler {');
  lines.push('');
  lines.push('    @ExceptionHandler(DataIntegrityViolationException.class)');
  lines.push(
    '    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {'
  );
  lines.push('        Map<String, String> response = new HashMap<>();');
  lines.push(
    '        response.put("error", "Conflicto de integridad de datos");'
  );
  lines.push(
    '        String message = ex.getMostSpecificCause() != null ? ex.getMostSpecificCause().getMessage() : ex.getMessage();'
  );
  lines.push('        response.put("message", message);');
  lines.push(
    '        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);'
  );
  lines.push('    }');
  lines.push('');
  lines.push('    @ExceptionHandler(IllegalArgumentException.class)');
  lines.push(
    '    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {'
  );
  lines.push('        Map<String, String> response = new HashMap<>();');
  lines.push('        response.put("error", "Peticion invalida");');
  lines.push('        response.put("message", ex.getMessage());');
  lines.push(
    '        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);'
  );
  lines.push('    }');
  lines.push('');
  lines.push('    @ExceptionHandler(EntityNotFoundException.class)');
  lines.push(
    '    public ResponseEntity<Map<String, String>> handleEntityNotFound(EntityNotFoundException ex) {'
  );
  lines.push('        Map<String, String> response = new HashMap<>();');
  lines.push('        response.put("error", "Entidad no encontrada");');
  lines.push('        response.put("message", ex.getMessage());');
  lines.push(
    '        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);'
  );
  lines.push('    }');
  lines.push('}');

  return lines.join('\n');
}
